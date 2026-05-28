import User from '../models/User.js';

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if (user) {
            user.name = req.body.name || user.name;
            user.mobile = req.body.mobile || user.mobile;
            user.experience = req.body.experience || user.experience;
            user.gender = req.body.gender || user.gender;
            user.qualification = req.body.qualification || user.qualification;
            user.country = req.body.country || user.country;

            // Update password if provided
            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.status(200).json({
                success: true,
                data: {
                    id: updatedUser._id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    role: updatedUser.role,
                    mobile: updatedUser.mobile,
                    experience: updatedUser.experience,
                    gender: updatedUser.gender,
                    qualification: updatedUser.qualification,
                    country: updatedUser.country,
                }
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        next(error);
    }
};
