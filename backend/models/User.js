import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    mobile: {
        type: String,
        required: [true, 'Please add a mobile number']
    },
    experience: {
        type: String
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other']
    },
    qualification: {
        type: String
    },
    country: {
        type: String
    },
    profilePic: {
        type: String,
        default: ''
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false
    },
    role: {
        type: String,
        enum: ['user', 'seller', 'admin', 'super_admin', 'moderator', 'finance_admin', 'support_admin'],
        default: 'user'
    },
    subscription: {
        plan: {
            type: String,
            enum: ['None', 'Silver', 'Ruby', 'Platinum'],
            default: 'None'
        },
        validUntil: {
            type: Date
        }
    },
    walletBalance: {
        type: Number,
        default: 0
    },
    refreshToken: {
        type: String
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    lastSeenNotifications: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Encrypt password using bcrypt
userSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function() {
    return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// Generate refresh token
userSchema.methods.getRefreshToken = function() {
    const refreshToken = jwt.sign({ id: this._id }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRE
    });
    this.refreshToken = refreshToken;
    return refreshToken;
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
