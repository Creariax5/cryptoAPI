import { ethers } from 'ethers';

export const validateAddress = (req, res, next) => {
    const { poolAddress } = req.params;
    if (!ethers.isAddress(poolAddress)) {
        return res.status(400).json({ error: 'Invalid Ethereum address' });
    }
    next();
};

export const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
