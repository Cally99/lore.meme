import '@testing-library/jest-dom/vitest';

// Mock fetch for API calls
global.fetch = global.fetch || require('undici').fetch;