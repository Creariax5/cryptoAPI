// src/queries.js
import NodeCache from 'node-cache';
import fetch from 'node-fetch';
import 'dotenv/config';

const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache
const GRAPH_API_KEY = process.env.GRAPH_API_KEY;
const UNISWAP_V3_GRAPH_URL = `https://gateway.thegraph.com/api/${GRAPH_API_KEY}/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV`;

async function fetchGraphQL(query, variables = {}) {
    if (!GRAPH_API_KEY) {
        throw new Error('GRAPH_API_KEY is required in environment variables');
    }

    try {
        const response = await fetch(UNISWAP_V3_GRAPH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query, variables })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const data = await response.json();
        if (data.errors) {
            console.error('GraphQL errors:', JSON.stringify(data.errors, null, 2));
            throw new Error(`GraphQL errors: ${data.errors[0].message}`);
        }

        return data;
    } catch (error) {
        console.error('GraphQL query error:', error);
        console.error('Query:', query);
        console.error('Variables:', JSON.stringify(variables, null, 2));
        throw error;
    }
}

export const getPoolTicks = async (poolAddress) => {
    const cacheKey = `ticks-${poolAddress}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) return cachedData;

    const query = `
        query PoolTicks($poolAddress: String!) {
            pool(id: $poolAddress) {
                ticks(first: 1000, orderBy: tickIdx) {
                    tickIdx
                    liquidityNet
                    liquidityGross
                    price0
                    price1
                }
            }
        }
    `;

    const response = await fetchGraphQL(query, { poolAddress: poolAddress.toLowerCase() });
    const ticks = response.data.pool?.ticks || [];
    cache.set(cacheKey, ticks);
    return ticks;
};

export const getPoolAnalytics = async (poolAddress, days = 7) => {
    const cacheKey = `analytics-${poolAddress}-${days}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) return cachedData;

    const query = `
        query PoolData($poolAddress: String!, $startTime: Int!) {
            pool(id: $poolAddress) {
                token0Price
                token1Price
                totalValueLockedUSD
                volumeUSD
                feesUSD
                poolDayData(
                    first: ${days}
                    orderBy: date
                    orderDirection: desc
                    where: { date_gt: $startTime }
                ) {
                    date
                    volumeUSD
                    tvlUSD
                    feesUSD
                    token0Price
                    token1Price
                }
            }
        }
    `;

    const startTime = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
    const response = await fetchGraphQL(query, { 
        poolAddress: poolAddress.toLowerCase(), 
        startTime 
    });

    const poolData = response.data?.pool || null;
    cache.set(cacheKey, poolData);
    return poolData;
};

export const getTopPools = async () => {
    const cacheKey = 'top-pools';
    const cachedData = cache.get(cacheKey);
    if (cachedData) return cachedData;

    // Calculate timestamp for 24 hours ago
    const startTime = Math.floor(Date.now() / 1000) - (24 * 60 * 60);

    const query = `
        query TopPools($startTime: Int!) {
            pools(
                first: 100,
                orderBy: totalValueLockedUSD,
                orderDirection: desc
            ) {
                id
                token0 {
                    id
                    symbol
                }
                token1 {
                    id
                    symbol
                }
                totalValueLockedUSD
                volumeUSD
                feeTier
                poolDayData(
                    first: ${30}
                    orderBy: date
                    orderDirection: desc
                    where: { date_gt: $startTime }
                ) {
                    volumeUSD
                    feesUSD
                }
            }
        }
    `;

    const variables = {
        startTime: startTime
    };

    const response = await fetchGraphQL(query, variables);
    const pools = response.data?.pools || [];
    cache.set(cacheKey, pools);
    return pools;
};

export const searchPools = async (searchQuery) => {
    const query = `{
        pools(
            where: {
                or: [
                    { token0_: { symbol_contains_nocase: "${searchQuery}" } },
                    { token1_: { symbol_contains_nocase: "${searchQuery}" } }
                ]
            },
            orderBy: totalValueLockedUSD,
            orderDirection: desc,
            first: 20
        ) {
            id
            token0 {
                id
                symbol
            }
            token1 {
                id
                symbol
            }
            totalValueLockedUSD
            volumeUSD
            feeTier
        }
    }`;

    const response = await fetchGraphQL(query);
    return response.data?.pools || [];
};

// Add the new functions we created earlier
export { getEnhancedPoolInfo, getPoolMetrics, getPoolRange } from './poolQueries.js';