import mongoose from 'mongoose';
import PracticeTest from '../models/PracticeTest.js';
import PracticeTestAttempt from '../models/PracticeTestAttempt.js';
import Course from '../models/Course.js';

// ── Seller CRUD ───────────────────────────────────────────────────────────────

// @desc    Get all practice tests for logged-in seller
// @route   GET /api/v1/practice-tests/mine
// @access  Private/Seller
export const getMyPracticeTests = async (req, res, next) => {
    try {
        const tests = await PracticeTest.find({ seller: req.user.id })
            .populate('course', 'title')
            .sort({ createdAt: -1 });

        // Enrich with attempt counts
        const enriched = await Promise.all(tests.map(async (test) => {
            const attemptCount = await PracticeTestAttempt.countDocuments({ practiceTest: test._id });
            return {
                ...test.toObject(),
                attemptCount,
                questionCount: test.questions.length,
                totalMarks: test.questions.reduce((s, q) => s + (q.marks || 1), 0)
            };
        }));

        res.status(200).json({ success: true, count: enriched.length, data: enriched });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all published practice tests (public listing)
// @route   GET /api/v1/practice-tests
// @access  Public
export const getPublicPracticeTests = async (req, res, next) => {
    try {
        const { search, subject } = req.query;
        let query = { isPublished: true };

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { subject: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }
        if (subject) query.subject = { $regex: subject, $options: 'i' };

        const tests = await PracticeTest.find(query)
            .populate('seller', 'name')
            .populate('course', 'title')
            .select('-questions.options.isCorrect') // Don't expose answers
            .sort({ createdAt: -1 });

        const enriched = tests.map(t => ({
            ...t.toObject(),
            questionCount: t.questions.length,
            totalMarks: t.questions.reduce((s, q) => s + (q.marks || 1), 0)
        }));

        res.status(200).json({ success: true, count: enriched.length, data: enriched });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single practice test detail (for sellers/admins — includes answer keys)
// @route   GET /api/v1/practice-tests/:id
// @access  Private
export const getPracticeTest = async (req, res, next) => {
    try {
        const test = await PracticeTest.findById(req.params.id)
            .populate('seller', 'name email')
            .populate('course', 'title');

        if (!test) return res.status(404).json({ message: 'Practice test not found' });

        const isSeller = test.seller._id.toString() === req.user.id;
        const isAdmin = ['admin', 'super_admin', 'moderator'].includes(req.user.role);

        // Public users only get the test without correct answer markings
        let data = test.toObject();
        if (!isSeller && !isAdmin) {
            if (!test.isPublished) {
                return res.status(404).json({ message: 'Practice test not found' });
            }
            // Strip correct answer flags from options
            data.questions = data.questions.map(q => ({
                ...q,
                options: q.options.map(o => ({ _id: o._id, text: o.text }))
            }));
        }

        // Attempt stats (only if logged in)
        const attemptCount = await PracticeTestAttempt.countDocuments({ practiceTest: test._id });
        const userAttempts = req.user
            ? await PracticeTestAttempt.find({
                practiceTest: test._id,
                user: req.user.id,
                status: 'completed'
            }).sort({ createdAt: -1 }).limit(20)
            : [];

        res.status(200).json({
            success: true,
            data: {
                ...data,
                questionCount: test.questions.length,
                totalMarks: test.questions.reduce((s, q) => s + (q.marks || 1), 0),
                totalAttempts: attemptCount,
                myAttempts: userAttempts
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a practice test
// @route   POST /api/v1/practice-tests
// @access  Private/Seller
export const createPracticeTest = async (req, res, next) => {
    try {
        const {
            title, subject, description, courseId, tags,
            timeLimit, hasPerQuestionTimer, maxAttempts, passingScore,
            shuffleQuestions, shuffleOptions, showResultsImmediately
        } = req.body;

        const testData = {
            title,
            subject,
            description: description || '',
            seller: req.user.id,
            tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
            timeLimit: Number(timeLimit) || 0,
            hasPerQuestionTimer: hasPerQuestionTimer === true || hasPerQuestionTimer === 'true',
            maxAttempts: Number(maxAttempts) || 0,
            passingScore: Number(passingScore) || 60,
            shuffleQuestions: shuffleQuestions === true || shuffleQuestions === 'true',
            shuffleOptions: shuffleOptions === true || shuffleOptions === 'true',
            showResultsImmediately: showResultsImmediately !== false && showResultsImmediately !== 'false'
        };

        if (courseId) {
            const course = await Course.findById(courseId);
            if (course) {
                testData.course = courseId;
            }
        }

        const test = await PracticeTest.create(testData);

        // If linked to a course, add to course's practiceTests array
        if (testData.course) {
            await Course.findByIdAndUpdate(testData.course, {
                $addToSet: { practiceTests: test._id }
            });
        }

        res.status(201).json({ success: true, data: test });
    } catch (error) {
        next(error);
    }
};

// @desc    Update practice test metadata
// @route   PUT /api/v1/practice-tests/:id
// @access  Private/Seller
export const updatePracticeTest = async (req, res, next) => {
    try {
        const test = await PracticeTest.findById(req.params.id);
        if (!test) return res.status(404).json({ message: 'Practice test not found' });

        const isSeller = test.seller.toString() === req.user.id;
        const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
        if (!isSeller && !isAdmin) return res.status(403).json({ message: 'Not authorized' });

        const updates = { ...req.body };
        if (updates.tags && typeof updates.tags === 'string') {
            updates.tags = updates.tags.split(',').map(t => t.trim());
        }
        // Don't let updates overwrite questions array through here
        delete updates.questions;
        delete updates.seller;

        const updated = await PracticeTest.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a practice test
// @route   DELETE /api/v1/practice-tests/:id
// @access  Private/Seller
export const deletePracticeTest = async (req, res, next) => {
    try {
        const test = await PracticeTest.findById(req.params.id);
        if (!test) return res.status(404).json({ message: 'Practice test not found' });

        const isSeller = test.seller.toString() === req.user.id;
        const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
        if (!isSeller && !isAdmin) return res.status(403).json({ message: 'Not authorized' });

        // Remove from course if linked
        if (test.course) {
            await Course.findByIdAndUpdate(test.course, {
                $pull: { practiceTests: test._id }
            });
        }

        // Delete all attempts
        await PracticeTestAttempt.deleteMany({ practiceTest: test._id });

        await test.deleteOne();
        res.status(200).json({ success: true, message: 'Practice test deleted' });
    } catch (error) {
        next(error);
    }
};

// @desc    Toggle publish/unpublish
// @route   PATCH /api/v1/practice-tests/:id/publish
// @access  Private/Seller
export const togglePracticeTestPublish = async (req, res, next) => {
    try {
        const test = await PracticeTest.findById(req.params.id);
        if (!test) return res.status(404).json({ message: 'Practice test not found' });

        const isSeller = test.seller.toString() === req.user.id;
        const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
        if (!isSeller && !isAdmin) return res.status(403).json({ message: 'Not authorized' });

        if (!test.isPublished && test.questions.length === 0) {
            return res.status(400).json({ message: 'Cannot publish a test with no questions' });
        }

        test.isPublished = !test.isPublished;
        await test.save();

        res.status(200).json({
            success: true,
            isPublished: test.isPublished,
            message: `Practice test ${test.isPublished ? 'published' : 'unpublished'}`
        });
    } catch (error) {
        next(error);
    }
};

// ── Question Management ───────────────────────────────────────────────────────

// @desc    Add a question to a practice test
// @route   POST /api/v1/practice-tests/:id/questions
// @access  Private/Seller
export const addQuestion = async (req, res, next) => {
    try {
        const test = await PracticeTest.findById(req.params.id);
        if (!test) return res.status(404).json({ message: 'Practice test not found' });

        const isSeller = test.seller.toString() === req.user.id;
        const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
        if (!isSeller && !isAdmin) return res.status(403).json({ message: 'Not authorized' });

        const { questionText, type, options, timeLimit, explanation, marks } = req.body;

        if (!questionText || !type || !options) {
            return res.status(400).json({ message: 'questionText, type, and options are required' });
        }

        let parsedOptions = options;
        if (typeof options === 'string') {
            try { parsedOptions = JSON.parse(options); } catch { return res.status(400).json({ message: 'Invalid options format' }); }
        }

        if (!Array.isArray(parsedOptions) || parsedOptions.length < 2 || parsedOptions.length > 5) {
            return res.status(400).json({ message: 'Options must be an array of 2-5 items' });
        }

        // Validate correctness
        const correctCount = parsedOptions.filter(o => o.isCorrect).length;
        if (type === 'MCQ' && correctCount !== 1) {
            return res.status(400).json({ message: 'MCQ must have exactly 1 correct option' });
        }
        if (type === 'MSQ' && correctCount < 1) {
            return res.status(400).json({ message: 'MSQ must have at least 1 correct option' });
        }

        const question = {
            questionText,
            type,
            options: parsedOptions,
            timeLimit: Number(timeLimit) || 0,
            explanation: explanation || '',
            marks: Number(marks) || 1,
            order: test.questions.length + 1
        };

        test.questions.push(question);
        await test.save();

        res.status(200).json({ success: true, data: test });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a question
// @route   PUT /api/v1/practice-tests/:id/questions/:questionId
// @access  Private/Seller
export const updateQuestion = async (req, res, next) => {
    try {
        const test = await PracticeTest.findById(req.params.id);
        if (!test) return res.status(404).json({ message: 'Practice test not found' });

        const isSeller = test.seller.toString() === req.user.id;
        const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
        if (!isSeller && !isAdmin) return res.status(403).json({ message: 'Not authorized' });

        const question = test.questions.id(req.params.questionId);
        if (!question) return res.status(404).json({ message: 'Question not found' });

        const { questionText, type, options, timeLimit, explanation, marks } = req.body;

        if (questionText) question.questionText = questionText;
        if (type) question.type = type;
        if (timeLimit !== undefined) question.timeLimit = Number(timeLimit) || 0;
        if (explanation !== undefined) question.explanation = explanation;
        if (marks !== undefined) question.marks = Number(marks) || 1;

        if (options) {
            let parsedOptions = options;
            if (typeof options === 'string') {
                try { parsedOptions = JSON.parse(options); } catch { return res.status(400).json({ message: 'Invalid options format' }); }
            }

            const correctCount = parsedOptions.filter(o => o.isCorrect).length;
            const qType = type || question.type;
            if (qType === 'MCQ' && correctCount !== 1) {
                return res.status(400).json({ message: 'MCQ must have exactly 1 correct option' });
            }
            if (qType === 'MSQ' && correctCount < 1) {
                return res.status(400).json({ message: 'MSQ must have at least 1 correct option' });
            }

            question.options = parsedOptions;
        }

        await test.save();
        res.status(200).json({ success: true, data: test });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a question
// @route   DELETE /api/v1/practice-tests/:id/questions/:questionId
// @access  Private/Seller
export const deleteQuestion = async (req, res, next) => {
    try {
        const test = await PracticeTest.findById(req.params.id);
        if (!test) return res.status(404).json({ message: 'Practice test not found' });

        const isSeller = test.seller.toString() === req.user.id;
        const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
        if (!isSeller && !isAdmin) return res.status(403).json({ message: 'Not authorized' });

        test.questions.pull(req.params.questionId);
        await test.save();

        res.status(200).json({ success: true, message: 'Question deleted', data: test });
    } catch (error) {
        next(error);
    }
};

// @desc    Reorder questions
// @route   PUT /api/v1/practice-tests/:id/questions/reorder
// @access  Private/Seller
export const reorderQuestions = async (req, res, next) => {
    try {
        const test = await PracticeTest.findById(req.params.id);
        if (!test) return res.status(404).json({ message: 'Practice test not found' });

        const isSeller = test.seller.toString() === req.user.id;
        const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
        if (!isSeller && !isAdmin) return res.status(403).json({ message: 'Not authorized' });

        const { order } = req.body; // [{ id, order }]
        if (!Array.isArray(order)) return res.status(400).json({ message: 'order must be an array' });

        order.forEach(({ id, order: newOrder }) => {
            const q = test.questions.id(id);
            if (q) q.order = newOrder;
        });

        test.questions.sort((a, b) => a.order - b.order);
        await test.save();

        res.status(200).json({ success: true, data: test });
    } catch (error) {
        next(error);
    }
};

// ── User Quiz Flow ─────────────────────────────────────────────────────────────

// @desc    Start a new attempt (returns test questions without answers)
// @route   POST /api/v1/practice-tests/:id/attempt/start
// @access  Private
export const startAttempt = async (req, res, next) => {
    try {
        const test = await PracticeTest.findById(req.params.id);
        if (!test || !test.isPublished) {
            return res.status(404).json({ message: 'Practice test not found' });
        }

        // Check max attempts
        if (test.maxAttempts > 0) {
            const attemptCount = await PracticeTestAttempt.countDocuments({
                practiceTest: test._id,
                user: req.user.id,
                status: 'completed'
            });
            if (attemptCount >= test.maxAttempts) {
                return res.status(400).json({
                    message: `Maximum attempts (${test.maxAttempts}) reached for this test`
                });
            }
        }

        // Cancel any in-progress attempt
        await PracticeTestAttempt.updateMany(
            { practiceTest: test._id, user: req.user.id, status: 'in_progress' },
            { $set: { status: 'abandoned' } }
        );

        // Count previous attempts for attempt number
        const prevCount = await PracticeTestAttempt.countDocuments({
            practiceTest: test._id,
            user: req.user.id
        });

        // Create new attempt record
        const attempt = await PracticeTestAttempt.create({
            user: req.user.id,
            practiceTest: test._id,
            attemptNumber: prevCount + 1,
            startedAt: new Date(),
            totalMarks: test.questions.reduce((s, q) => s + (q.marks || 1), 0),
            status: 'in_progress'
        });

        // Prepare questions without correct answers
        let questions = test.questions.map(q => ({
            _id: q._id,
            questionText: q.questionText,
            type: q.type,
            options: q.options.map(o => ({ _id: o._id, text: o.text })),
            timeLimit: q.timeLimit,
            marks: q.marks,
            order: q.order,
            image: q.image
        }));

        // Shuffle if configured
        if (test.shuffleQuestions) {
            questions = questions.sort(() => Math.random() - 0.5);
        }

        res.status(200).json({
            success: true,
            data: {
                attemptId: attempt._id,
                test: {
                    _id: test._id,
                    title: test.title,
                    subject: test.subject,
                    timeLimit: test.timeLimit,
                    hasPerQuestionTimer: test.hasPerQuestionTimer,
                    passingScore: test.passingScore,
                    shuffleOptions: test.shuffleOptions,
                    showResultsImmediately: test.showResultsImmediately
                },
                questions,
                startedAt: attempt.startedAt
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Submit an attempt
// @route   POST /api/v1/practice-tests/:id/attempt/:attemptId/submit
// @access  Private
export const submitAttempt = async (req, res, next) => {
    try {
        const test = await PracticeTest.findById(req.params.id);
        if (!test) return res.status(404).json({ message: 'Practice test not found' });

        const attempt = await PracticeTestAttempt.findOne({
            _id: req.params.attemptId,
            user: req.user.id,
            practiceTest: test._id,
            status: 'in_progress'
        });

        if (!attempt) return res.status(404).json({ message: 'Active attempt not found' });

        const { answers, timeTaken } = req.body;
        // answers: [{ questionId, selectedOptionIds: [string], timeTaken: number }]

        if (!Array.isArray(answers)) return res.status(400).json({ message: 'answers must be an array' });

        let totalScore = 0;
        const totalMarks = test.questions.reduce((s, q) => s + (q.marks || 1), 0);
        const processedAnswers = [];

        for (const ans of answers) {
            const question = test.questions.id(ans.questionId);
            if (!question) continue;

            const selectedIds = Array.isArray(ans.selectedOptionIds) ? ans.selectedOptionIds : [];
            const correctOptionIds = question.options
                .filter(o => o.isCorrect)
                .map(o => o._id.toString());

            let isCorrect = false;
            let marksAwarded = 0;

            if (question.type === 'MCQ') {
                // Single correct — must match exactly
                isCorrect = selectedIds.length === 1 && correctOptionIds.includes(selectedIds[0]);
                marksAwarded = isCorrect ? question.marks : 0;
            } else if (question.type === 'MSQ') {
                // All correct options must be selected, no incorrect ones
                const sortedSelected = [...selectedIds].sort().join(',');
                const sortedCorrect = [...correctOptionIds].sort().join(',');
                isCorrect = sortedSelected === sortedCorrect;
                
                if (isCorrect) {
                    marksAwarded = question.marks;
                } else if (selectedIds.length > 0) {
                    // Partial marking: award marks proportionally for each correct selection
                    const correctlySelected = selectedIds.filter(id => correctOptionIds.includes(id));
                    const incorrectlySelected = selectedIds.filter(id => !correctOptionIds.includes(id));
                    if (incorrectlySelected.length === 0) {
                        marksAwarded = (correctlySelected.length / correctOptionIds.length) * question.marks;
                    }
                }
            }

            if (isCorrect) totalScore += marksAwarded;

            processedAnswers.push({
                questionId: question._id,
                questionText: question.questionText,
                type: question.type,
                selectedOptions: selectedIds.map(id => {
                    try { return new mongoose.Types.ObjectId(id); } catch { return id; }
                }),
                correctOptions: question.options.filter(o => o.isCorrect).map(o => o._id),
                isCorrect,
                timeTaken: Number(ans.timeTaken) || 0,
                marksAwarded,
                marksAvailable: question.marks
            });
        }

        const percentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;
        const passed = percentage >= test.passingScore;

        // Update attempt
        attempt.answers = processedAnswers;
        attempt.score = totalScore;
        attempt.totalMarks = totalMarks;
        attempt.percentage = percentage;
        attempt.passed = passed;
        attempt.completedAt = new Date();
        attempt.timeTaken = Number(timeTaken) || 0;
        attempt.status = 'completed';
        await attempt.save();

        // Update test stats
        const allAttempts = await PracticeTestAttempt.find({ practiceTest: test._id, status: 'completed' });
        test.totalAttempts = allAttempts.length;
        test.avgScore = allAttempts.length > 0
            ? Math.round(allAttempts.reduce((s, a) => s + a.percentage, 0) / allAttempts.length)
            : 0;
        test.passRate = allAttempts.length > 0
            ? Math.round((allAttempts.filter(a => a.passed).length / allAttempts.length) * 100)
            : 0;
        await test.save();

        // Prepare result with explanations
        const resultData = {
            attemptId: attempt._id,
            score: totalScore,
            totalMarks,
            percentage,
            passed,
            passingScore: test.passingScore,
            timeTaken: attempt.timeTaken
        };

        if (test.showResultsImmediately) {
            resultData.questionResults = test.questions.map(q => {
                const ans = processedAnswers.find(a => a.questionId.toString() === q._id.toString());
                return {
                    _id: q._id,
                    questionText: q.questionText,
                    type: q.type,
                    options: q.options.map(o => ({
                        _id: o._id,
                        text: o.text,
                        isCorrect: o.isCorrect,
                        wasSelected: ans?.selectedOptions?.map(s => s.toString()).includes(o._id.toString()) || false
                    })),
                    isCorrect: ans?.isCorrect || false,
                    marksAwarded: ans?.marksAwarded || 0,
                    marksAvailable: q.marks,
                    explanation: q.explanation,
                    timeTaken: ans?.timeTaken || 0
                };
            });
        }

        res.status(200).json({ success: true, data: resultData });
    } catch (error) {
        next(error);
    }
};

// @desc    Get a specific attempt result
// @route   GET /api/v1/practice-tests/:id/attempts/:attemptId
// @access  Private
export const getAttemptResult = async (req, res, next) => {
    try {
        const attempt = await PracticeTestAttempt.findOne({
            _id: req.params.attemptId,
            user: req.user.id
        });

        if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

        const test = await PracticeTest.findById(attempt.practiceTest);
        if (!test) return res.status(404).json({ message: 'Test not found' });

        // Build full result with question details
        const questionResults = test.questions.map(q => {
            const ans = attempt.answers.find(a => a.questionId.toString() === q._id.toString());
            return {
                _id: q._id,
                questionText: q.questionText,
                type: q.type,
                options: q.options.map(o => ({
                    _id: o._id,
                    text: o.text,
                    isCorrect: o.isCorrect,
                    wasSelected: ans?.selectedOptions?.map(s => s.toString()).includes(o._id.toString()) || false
                })),
                isCorrect: ans?.isCorrect || false,
                marksAwarded: ans?.marksAwarded || 0,
                marksAvailable: q.marks,
                explanation: q.explanation,
                timeTaken: ans?.timeTaken || 0
            };
        });

        res.status(200).json({
            success: true,
            data: {
                attempt: {
                    _id: attempt._id,
                    attemptNumber: attempt.attemptNumber,
                    score: attempt.score,
                    totalMarks: attempt.totalMarks,
                    percentage: attempt.percentage,
                    passed: attempt.passed,
                    timeTaken: attempt.timeTaken,
                    startedAt: attempt.startedAt,
                    completedAt: attempt.completedAt,
                    status: attempt.status
                },
                test: {
                    title: test.title,
                    subject: test.subject,
                    passingScore: test.passingScore
                },
                questionResults
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get my attempts for a test
// @route   GET /api/v1/practice-tests/:id/my-attempts
// @access  Private
export const getMyAttempts = async (req, res, next) => {
    try {
        const attempts = await PracticeTestAttempt.find({
            practiceTest: req.params.id,
            user: req.user.id,
            status: 'completed'
        }).sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: attempts });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all my attempts across all tests
// @route   GET /api/v1/practice-tests/my-attempts/all
// @access  Private
export const getAllMyAttempts = async (req, res, next) => {
    try {
        const attempts = await PracticeTestAttempt.find({ user: req.user.id, status: 'completed' })
            .populate('practiceTest', 'title subject passingScore')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: attempts });
    } catch (error) {
        next(error);
    }
};

// ── Admin Controllers ─────────────────────────────────────────────────────────

// @desc    Admin: Get all practice tests
// @route   GET /api/v1/admin/practice-tests
// @access  Private/Admin
export const adminGetAllPracticeTests = async (req, res, next) => {
    try {
        const tests = await PracticeTest.find()
            .populate('seller', 'name email')
            .populate('course', 'title')
            .sort({ createdAt: -1 });

        const enriched = await Promise.all(tests.map(async (test) => {
            const attemptCount = await PracticeTestAttempt.countDocuments({ practiceTest: test._id });
            return {
                ...test.toObject(),
                attemptCount,
                questionCount: test.questions.length,
                totalMarks: test.questions.reduce((s, q) => s + (q.marks || 1), 0)
            };
        }));

        res.status(200).json({ success: true, count: enriched.length, data: enriched });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Force toggle publish
// @route   PATCH /api/v1/admin/practice-tests/:id/publish
// @access  Private/Admin
export const adminTogglePracticeTestPublish = async (req, res, next) => {
    try {
        const test = await PracticeTest.findById(req.params.id);
        if (!test) return res.status(404).json({ message: 'Practice test not found' });

        test.isPublished = !test.isPublished;
        await test.save();

        res.status(200).json({
            success: true,
            isPublished: test.isPublished,
            message: `Practice test ${test.isPublished ? 'published' : 'unpublished'} by admin`
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: Delete a practice test
// @route   DELETE /api/v1/admin/practice-tests/:id
// @access  Private/Admin
export const adminDeletePracticeTest = async (req, res, next) => {
    try {
        const test = await PracticeTest.findById(req.params.id);
        if (!test) return res.status(404).json({ message: 'Practice test not found' });

        if (test.course) {
            await Course.findByIdAndUpdate(test.course, { $pull: { practiceTests: test._id } });
        }

        await PracticeTestAttempt.deleteMany({ practiceTest: test._id });
        await test.deleteOne();

        res.status(200).json({ success: true, message: 'Practice test permanently deleted' });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin: View attempts for a test
// @route   GET /api/v1/admin/practice-tests/:id/attempts
// @access  Private/Admin
export const adminGetTestAttempts = async (req, res, next) => {
    try {
        const test = await PracticeTest.findById(req.params.id).select('title subject questions passingScore');
        if (!test) return res.status(404).json({ message: 'Practice test not found' });

        const attempts = await PracticeTestAttempt.find({ practiceTest: req.params.id })
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        // Most missed questions analytics
        const questionMissRate = {};
        test.questions.forEach(q => {
            questionMissRate[q._id.toString()] = { questionText: q.questionText, missed: 0, total: 0 };
        });

        attempts.forEach(attempt => {
            attempt.answers.forEach(ans => {
                const qId = ans.questionId.toString();
                if (questionMissRate[qId]) {
                    questionMissRate[qId].total++;
                    if (!ans.isCorrect) questionMissRate[qId].missed++;
                }
            });
        });

        const missRateArray = Object.values(questionMissRate)
            .filter(q => q.total > 0)
            .map(q => ({ ...q, missRate: Math.round((q.missed / q.total) * 100) }))
            .sort((a, b) => b.missRate - a.missRate);

        res.status(200).json({
            success: true,
            data: {
                test: { _id: test._id, title: test.title, subject: test.subject, passingScore: test.passingScore },
                attempts,
                analytics: {
                    totalAttempts: attempts.length,
                    avgScore: attempts.length ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length) : 0,
                    passRate: attempts.length ? Math.round((attempts.filter(a => a.passed).length / attempts.length) * 100) : 0,
                    mostMissedQuestions: missRateArray.slice(0, 5)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};
