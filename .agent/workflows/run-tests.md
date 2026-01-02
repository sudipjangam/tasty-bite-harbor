---
description: Run tests and check coverage
---

# Testing Workflow

## Run All Tests
```bash
npm test
```

## Run Tests in Watch Mode
```bash
npm test -- --watch
```

## Run Specific Test File
```bash
npm test -- src/tests/pages/Orders.test.tsx
```

## Run with Coverage Report
```bash
npm test -- --coverage
```

## Test Structure
```
src/tests/
├── pages/           # Page component tests
├── integration/     # Integration tests  
└── utils/           # Test utilities and mocks
```

## Writing Tests
- Use `render()` from `@/tests/utils/test-utils`
- Mock Supabase with `vi.mock('@/integrations/supabase/client')`
- Mock hooks with `vi.mock('@tanstack/react-query')`

## QSR POS Testing
See `docs/QSR-POS-Test-Checklist.md` for manual test scenarios.
