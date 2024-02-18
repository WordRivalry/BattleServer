// __test__/__mocks__/logger.ts

export const createScopedLogger = (scope: string) => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    context: () => createScopedLogger(scope),
});
