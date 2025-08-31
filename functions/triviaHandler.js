const { Client } = await import('node-rest-client');
import { decode } from 'html-entities';

// Create a singleton client
const client = new Client();

// Configuration options for more flexibility
const TRIVIA_CONFIG = {
    baseUrl: 'https://opentdb.com/api.php',
    defaultParams: {
        amount: 1,
        type: 'multiple'
    },
    categories: {
        generalKnowledge: 9,
        books: 10,
        film: 11,
        music: 12,
        television: 14,
        videoGames: 15,
        scienceNature: 17,
        computers: 18,
        sports: 21
    },
    difficulties: ['easy', 'medium', 'hard']
};

// Cache for previously asked questions to avoid repetition
const questionCache = new Set();
const MAX_CACHE_SIZE = 500;

export function decodeHtmlEntities(str) {
    return decode(str);
}

/**
 * Get a trivia question with optional category and difficulty
 * @param {Object} options - Configuration options
 * @param {number} [options.category] - Category ID from TRIVIA_CONFIG.categories
 * @param {string} [options.difficulty] - Difficulty level (easy, medium, hard)
 * @param {boolean} [options.avoidRepeats=true] - Whether to avoid recently asked questions
 * @returns {Promise<Object>} - The formatted question object
 */
export async function getTriviaQuestion(options = {}) {
    // Build API URL with parameters
    const params = new URLSearchParams({
        ...TRIVIA_CONFIG.defaultParams
    });

    if (options.category) {
        params.append('category', options.category);
    }

    if (options.difficulty && TRIVIA_CONFIG.difficulties.includes(options.difficulty)) {
        params.append('difficulty', options.difficulty);
    }

    const apiUrl = `${TRIVIA_CONFIG.baseUrl}?${params.toString()}`;

    return new Promise((resolve, reject) => {
        client.get(apiUrl, async (data, response) => {
            try {
                // Handle API response codes
                if (data.response_code !== 0) {
                    const errors = {
                        1: 'No results found. Try different parameters.',
                        2: 'Invalid parameter. Check your category or difficulty setting.',
                        3: 'Token not found. Session expired.',
                        4: 'Token empty. All questions for these settings have been used.'
                    };
                    throw new Error(errors[data.response_code] || 'API error');
                }

                if (data && data.results && data.results.length > 0) {
                    const result = data.results[0];

                    // Create a unique signature for this question to check for repeats
                    const questionSignature = `${result.question}`;

                    // Skip repeated questions if enabled
                    if (options.avoidRepeats !== false && questionCache.has(questionSignature)) {
                        // Try once more with different parameters
                        return resolve(await getTriviaQuestion({
                            ...options,
                            avoidRepeats: false // Prevent infinite recursion
                        }));
                    }

                    // Add to cache and manage cache size
                    questionCache.add(questionSignature);
                    if (questionCache.size > MAX_CACHE_SIZE) {
                        // Remove oldest entry (approximate using iterator)
                        questionCache.delete(questionCache.values().next().value);
                    }

                    // Decode the question text
                    const questionText = decodeHtmlEntities(result.question);

                    // Decode all answer options (both correct and incorrect)
                    const correctAnswer = decodeHtmlEntities(result.correct_answer);
                    const incorrectAnswers = result.incorrect_answers.map(ans => decodeHtmlEntities(ans));

                    // Combine and shuffle the answers
                    const allAnswers = [...incorrectAnswers, correctAnswer].sort(() => Math.random() - 0.5);

                    // Find the index of the correct answer in the shuffled list
                    const correctIndex = allAnswers.indexOf(correctAnswer);

                    // Add metadata for enhanced features
                    const enhancedQuestion = {
                        question: questionText,
                        answers: allAnswers,
                        correctAnswerIndex: correctIndex,
                        metadata: {
                            category: result.category,
                            difficulty: result.difficulty,
                            type: result.type
                        }
                    };

                    resolve(enhancedQuestion);
                } else {
                    reject(new Error('Invalid data received'));
                }
            } catch (error) {
                reject(error);
            }
        }).on('error', (err) => {
            reject(new Error(`Request failed: ${err.message}`));
        });
    });
}

/**
 * Get available trivia categories from API
 * @returns {Promise<Array>} - List of available categories
 */
export async function getAvailableCategories() {
    return new Promise((resolve, reject) => {
        client.get('https://opentdb.com/api_category.php', (data, response) => {
            if (data && data.trivia_categories) {
                resolve(data.trivia_categories);
            } else {
                reject(new Error('Failed to fetch categories'));
            }
        }).on('error', (err) => {
            reject(new Error(`Request failed: ${err.message}`));
        });
    });
}