# Skill Progression System API Documentation

The Skill Progression system tracks AI agent growth across various skills, providing XP awards, level-ups, achievements, and intelligent recommendations.

## Core Concepts

### Skill Levels

Skills progress through 5 levels:

1. `beginner` (0 XP)
2. `intermediate` (100 XP)
3. `advanced` (350 XP)
4. `expert` (850 XP)
5. `master` (1850 XP)

### Skill Categories

Skills are organized into categories for easier tracking and recommendations:

- `coding`, `web`, `systems`, `database`, `tools`, `research`, `communication`, `domain`.

---

## 🚀 Advanced Features (Phase 4)

### 📉 Skill Decay

Skills that remain unused for an extended period will lose XP over time.

- **Idle Threshold**: 7 days.
- **Decay Rate**: 5 XP per day.
- **Minimum Level**: Decay will not drop a skill below `intermediate`.

### 🌳 Skill Trees & Dependencies

Certain skills can be configured to require others before XP can be earned.

- Example: `typescript` may require `javascript` to be at `intermediate` level.

### 🏆 Achievement System

Agents earn badges and milestones for specific accomplishments:

- **First Steps**: Earn your first skill.
- **Skill Collector**: Earn 5 different skills.
- **Master of One**: Reach `master` level in any skill.
- **Coding Wizard**: Reach `expert` level in 3 coding skills.

---

## 🛠️ API Examples

### Awarding XP

XP is automatically awarded via `synergy-manager` on task completion, but can be called manually:

```typescript
await skillProgressionManager.awardTaskXP(
    'agent-001',
    'Rami Bot',
    'coding',
    true,
    ['typescript', 'terminal']
)
```

### Retrieving Reports

Get a comprehensive progress report for an agent:

```typescript
const report = await skillProgressionManager.getProgressionReport('agent-001');
console.log(report.achievements);
console.log(report.skillDistribution);
```

### Setting Dependencies

```typescript
skillProgressionManager.setSkillDependencies([
    {
        skillName: 'typescript',
        requiredSkillName: 'javascript',
        requiredLevel: 'intermediate'
    }
]);
```
