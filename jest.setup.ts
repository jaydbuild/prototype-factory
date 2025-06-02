// Jest setup file
import '@testing-library/jest-dom';

// Global Jest type definitions to avoid TS errors
global.jest = jest;
global.describe = describe;
global.it = it;
global.expect = expect;
global.beforeEach = beforeEach;
global.afterEach = afterEach;
