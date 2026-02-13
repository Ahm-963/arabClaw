# Policy Constraint Tests (Documentation)

This document describes the unit tests that should be implemented for the Policy Engine to validate agent permission constraints.

## Test Framework

Use Jest or Mocha for testing. Install with:

```bash
npm install --save-dev @types/jest jest ts-jest
```

## Test Cases

### 1. Coder Permissions

- ✅ **Coder can write files** - Should be allowed by policy
- ✅ **Coder CANNOT delete files** - No permission defined, should deny

### 2. Researcher Permissions

- ✅ **Researcher can access web** - Network access allowed
- ✅ **Researcher CANNOT write files** - Should be denied

### 3. Reviewer Permissions

- ✅ **Reviewer can read files** - Read-only access granted
- ✅ **Reviewer CANNOT write files** - Write access denied
- ✅ **Reviewer CANNOT delete files** - Delete access denied

### 4. Temporary Permissions

- ✅ **Grants access** - Temp permission should allow action
- ✅ **Expires automatically** - After TTL, should revert to deny
- ✅ **Event emission** - Should emit policy update events

### 5. Tool Mapping

- ✅ **write_file** → `{action: 'write', resource: 'file'}`
- ✅ **web_search** → `{action: 'network', resource: 'web'}`
- ✅ **Safe tools** → `null` (no policy check needed)

## Example Test Implementation

```typescript
import { PolicyEngine } from '../organization/policy-engine'

describe('PolicyEngine', () => {
    let engine: PolicyEngine

    beforeEach(() => {
        engine = new PolicyEngine()
    })

    test('Coder can write files', () => {
        const result = engine.checkPermission('coder', 'write', 'file', 'test.ts')
        expect(result.allowed).toBe(true)
    })

    test('Reviewer CANNOT write files', () => {
        const result = engine.checkPermission('reviewer', 'write', 'file', 'test.ts')
        expect(result.allowed).toBe(false)
    })
})
```

## Running Tests

```bash
npm test
```

## Coverage Goals

- 100% of default policies tested
- All agent roles validated
- Temporary permission lifecycle verified
- Tool mapping completeness checked
