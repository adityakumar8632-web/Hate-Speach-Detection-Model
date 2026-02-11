const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();

// ===============================
// MIDDLEWARE
// ===============================
app.use(cors({
    origin: '*', // Allow all origins (you can restrict this in production)
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ===============================
// CONFIGURATION
// ===============================
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ===============================
// STARTUP CHECK
// ===============================
if (!OPENAI_API_KEY) {
    console.error('❌ CRITICAL: OPENAI_API_KEY environment variable is not set!');
    console.error('⚠️  Server will start but API requests will fail.');
    console.error('💡 Set OPENAI_API_KEY in your Render environment variables.');
} else {
    console.log('✅ OpenAI API Key detected (length:', OPENAI_API_KEY.length, ')');
}

// ===============================
// ROUTES
// ===============================

// Health check route
app.get("/", (req, res) => {
    const status = {
        status: "running",
        message: "AI Moderation Backend is running 🚀",
        timestamp: new Date().toISOString(),
        apiKeyConfigured: !!OPENAI_API_KEY,
        endpoints: {
            health: "GET /",
            analyze: "POST /analyze"
        }
    };
    
    console.log('✅ Health check successful');
    res.json(status);
});

// Analyze text route
app.post("/analyze", async (req, res) => {
    console.log('📨 Received analyze request');
    
    try {
        const { text } = req.body;

        // ===========================
        // INPUT VALIDATION
        // ===========================
        if (!text) {
            console.log('⚠️  Validation failed: No text provided');
            return res.status(400).json({
                error: "Text is required",
                details: "Please provide text to analyze"
            });
        }

        if (typeof text !== "string") {
            console.log('⚠️  Validation failed: Text is not a string');
            return res.status(400).json({
                error: "Invalid input type",
                details: "Text must be a string"
            });
        }

        if (text.trim().length === 0) {
            console.log('⚠️  Validation failed: Empty text');
            return res.status(400).json({
                error: "Empty text",
                details: "Please provide non-empty text to analyze"
            });
        }

        if (text.length > 10000) {
            console.log('⚠️  Validation failed: Text too long');
            return res.status(400).json({
                error: "Text too long",
                details: "Maximum 10,000 characters allowed"
            });
        }

        // ===========================
        // API KEY CHECK
        // ===========================
        if (!OPENAI_API_KEY) {
            console.error('❌ API key not configured');
            return res.status(500).json({
                error: "Server configuration error",
                details: "OpenAI API key is not configured. Please contact the administrator."
            });
        }

        console.log('📤 Sending request to OpenAI Moderation API...');
        console.log('   Text length:', text.length, 'characters');

        // ===========================
        // CALL OPENAI MODERATION API
        // ===========================
        const response = await fetch("https://api.openai.com/v1/moderations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "omni-moderation-latest",
                input: text
            })
        });

        console.log('📡 OpenAI API response status:', response.status);

        // ===========================
        // HANDLE API ERRORS
        // ===========================
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ OpenAI API error:', response.status, errorText);
            
            // Provide helpful error messages
            if (response.status === 401) {
                return res.status(500).json({
                    error: "API authentication failed",
                    details: "Invalid or expired OpenAI API key"
                });
            } else if (response.status === 429) {
                return res.status(429).json({
                    error: "Rate limit exceeded",
                    details: "Too many requests. Please try again later."
                });
            } else {
                return res.status(502).json({
                    error: "OpenAI API error",
                    details: `API returned status ${response.status}`
                });
            }
        }

        // ===========================
        // PARSE AND RETURN RESPONSE
        // ===========================
        const data = await response.json();
        console.log('✅ Analysis completed successfully');
        console.log('   Flagged:', data.results?.[0]?.flagged);
        
        // Send the complete response to frontend
        res.json(data);

    } catch (error) {
        console.error('❌ Server error:', error.message);
        console.error('   Stack:', error.stack);
        
        // Determine error type and respond accordingly
        if (error.message.includes('fetch')) {
            return res.status(502).json({
                error: "Failed to connect to OpenAI",
                details: "Could not reach OpenAI API. Please try again."
            });
        }
        
        res.status(500).json({
            error: "Internal server error",
            details: error.message
        });
    }
});

// ===============================
// 404 HANDLER
// ===============================
app.use((req, res) => {
    console.log('⚠️  404 Not Found:', req.method, req.path);
    res.status(404).json({
        error: "Not found",
        message: "The requested endpoint does not exist",
        availableEndpoints: {
            health: "GET /",
            analyze: "POST /analyze"
        }
    });
});

// ===============================
// ERROR HANDLER
// ===============================
app.use((error, req, res, next) => {
    console.error('💥 Unhandled error:', error);
    res.status(500).json({
        error: "Internal server error",
        details: error.message
    });
});

// ===============================
// START SERVER
// ===============================
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 AI MODERATION BACKEND SERVER');
    console.log('='.repeat(50));
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🔑 API Key: ${OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
    console.log('='.repeat(50) + '\n');
});

// ===============================
// GRACEFUL SHUTDOWN
// ===============================
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('👋 SIGINT received, shutting down gracefully...');
    process.exit(0);
});