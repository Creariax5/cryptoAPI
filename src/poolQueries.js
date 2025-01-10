// src/poolQueries.js
import { Contract } from 'ethers';
import NodeCache from 'node-cache';
import fetch from 'node-fetch';
import { UNISWAP_V3_POOL_ABI, ERC20_ABI } from './constants.js';

const cache = new NodeCache({ stdTTL: 300 });

// Move fetchGraphQL here since we need it
async function fetchGraphQL(query, variables = {}) {
    const GRAPH_API_KEY = process.env.GRAPH_API_KEY;
    if (!GRAPH_API_KEY) {
        throw new Error('GRAPH_API_KEY is required in environment variables');
    }

    const UNISWAP_V3_GRAPH_URL = `https://gateway.thegraph.com/api/${GRAPH_API_KEY}/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV`;

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

let provider;
const initializeProvider = () => {
    if (!provider) {
        if (!process.env.RPC_URL) {
            throw new Error('RPC_URL not found in environment variables');
        }
        try {
            provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
            provider.getNetwork().catch(error => {
                console.error('Failed to initialize provider:', error);
                provider = null;
                throw new Error('Failed to connect to Ethereum network');
            });
        } catch (error) {
            console.error('Provider initialization error:', error);
            throw new Error('Failed to initialize Ethereum provider');
        }
    }
    return provider;
};

export const getEnhancedPoolInfo = async (poolAddress) => {
    const cacheKey = `enhanced-pool-${poolAddress}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) return cachedData;

    const provider = initializeProvider();
    const poolContract = new Contract(poolAddress, UNISWAP_V3_POOL_ABI, provider);
    
    const [token0Address, token1Address, fee, liquidity, slot0] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
        poolContract.liquidity(),
        poolContract.slot0()
    ]);

    // Fetch token metadata from Graph API
    const tokenData = await fetchGraphQL(TOKEN_METADATA_QUERY, {
        tokenIds: [token0Address.toLowerCase(), token1Address.toLowerCase()]
    });

    const tokens = tokenData.data.tokens.reduce((acc, token) => {
        acc[token.id] = token;
        return acc;
    }, {});

    const poolInfo = {
        address: poolAddress,
        token0: {
            address: token0Address,
            symbol: tokens[token0Address.toLowerCase()]?.symbol || 'Unknown',
            logo: `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${token0Address}/logo.png`
        },
        token1: {
            address: token1Address,
            symbol: tokens[token1Address.toLowerCase()]?.symbol || 'Unknown',
            logo: `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${token1Address}/logo.png`
        },
        fee: Number(fee),
        liquidity: liquidity.toString(),
        sqrtPrice: slot0.sqrtPriceX96.toString(),
        tick: Number(slot0.tick)
    };

    cache.set(cacheKey, poolInfo);
    return poolInfo;
};

// Other functions remain the same
export const getPoolMetrics = async (poolAddress) => {
    // Implementation as before
};

export const getPoolRange = async (poolAddress) => {
    // Implementation as before
};

const TOKEN_METADATA_QUERY = `
    query TokenData($tokenIds: [String!]!) {
        tokens(where: { id_in: $tokenIds }) {
            id
            symbol
            derivedETH
        }
    }
`;
