import User from '../models/User.js';
import ChatSession from '../models/ChatSession.js';
import mongoose from 'mongoose';


export const blockUser = async (req, res) => {
    try {
        const blockerId = req.user.id;
        const { userId: blockedId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(blockedId)) {
            return res.status(400).json({ msg: 'Invalid user ID' });
        }
        const blockedIdObj = new mongoose.Types.ObjectId(blockedId);

        if (blockerId.equals(blockedIdObj)) {
            return res.status(400).json({ msg: 'You cannot block yourself' });
        }

        const user = await User.findById(blockerId);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (!user.blockList.some(id => id.equals(blockedIdObj))) {
            user.blockList.push(blockedIdObj);
            await user.save();
        }

        // --- End Active Chat (Implicit Unmatch) ---
        const chat = await ChatSession.findOneAndUpdate(
        {
            participants: { $all: [blockerId, blockedIdObj] },
            active: true,
        },
        {
            $set: {
            active: false,
            endedAt: new Date(),
            isSaved: false,
            savedBy: []     
            }
        }
        );
    res.status(200).json({ msg: 'User blocked' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};