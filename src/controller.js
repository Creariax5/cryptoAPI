import { ethers } from 'ethers';
import { Contract } from 'ethers';
import NodeCache from 'node-cache';
import * as queries from './queries.js';  // Make sure to add .js extension
import 'dotenv/config';  // This replaces dotenv.config()

const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

let provider;

const initializeProvider = () => {
    if (!provider) {
        if (!process.env.RPC_URL) {
            throw new Error('RPC_URL not found in environment variables');
        }
        try {
            provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
            // Add a check for provider readiness
            provider.getNetwork().catch(error => {
                console.error('Failed to initialize provider:', error);
                provider = null; // Reset provider if initialization fails
                throw new Error('Failed to connect to Ethereum network');
            });
        } catch (error) {
            console.error('Provider initialization error:', error);
            throw new Error('Failed to initialize Ethereum provider');
        }
    }
    return provider;
};

const UNISWAP_V3_POOL_ABI = [
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function fee() external view returns (uint24)',
    'function liquidity() external view returns (uint128)',
    'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)'
];

export const getPoolInfo = async (req, res) => {
    const { poolAddress } = req.params;
    const cacheKey = `pool-${poolAddress}`;
    
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
        return res.json(cachedData);
    }

    const provider = initializeProvider();
    const poolContract = new Contract(poolAddress, UNISWAP_V3_POOL_ABI, provider);
    
    const [token0, token1, fee, liquidity, slot0] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
        poolContract.liquidity(),
        poolContract.slot0()
    ]);

    const poolData = {
        address: poolAddress,
        token0,
        token1,
        fee: Number(fee),
        liquidity: liquidity.toString(),
        sqrtPrice: slot0.sqrtPriceX96.toString(),
        tick: Number(slot0.tick)
    };

    cache.set(cacheKey, poolData);
    res.json(poolData);
};

export const getPoolTicks = async (req, res) => {
    const { poolAddress } = req.params;
    const ticks = await queries.getPoolTicks(poolAddress);
    res.json(ticks);
};

export const getPoolAnalytics = async (req, res) => {
    const { poolAddress } = req.params;
    const { days = 7 } = req.query;
    const analytics = await queries.getPoolAnalytics(poolAddress, parseInt(days));
    res.json(analytics);
};

export const searchPools = async (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }
    const pools = await queries.searchPools(query);
    res.json(pools);
};

export const getTopPools = async (req, res) => {
    const pools = await queries.getTopPools();
    res.json(pools);
};

export const getEnhancedPoolInfo = async (req, res) => {
    const { poolAddress } = req.params;
    const poolInfo = await queries.getEnhancedPoolInfo(poolAddress);
    res.json(poolInfo);
};

export const getPoolMetrics = async (req, res) => {
    const { poolAddress } = req.params;
    const metrics = await queries.getPoolMetrics(poolAddress);
    res.json(metrics);
};

export const getPoolRange = async (req, res) => {
    const { poolAddress } = req.params;
    const range = await queries.getPoolRange(poolAddress);
    res.json(range);
};
