export const MEMORY_SKILL = {
    name: 'Long-Term Memory (MemGPT)',
    description: 'Advanced memory management. Allows storing and retrieving facts beyond the conversation context.',
    systemPrompt: `
## MEMORY MANAGEMENT (MemGPT Mode)
You have a "Long-Term Memory" to store important facts about the user or projects.
- **STORE**: When the user tells you a preference, bio, or key project detail, use \`remember_fact\`.
- **RECALL**: When starting a new task, use \`recall_memories\` to check if you know relevant info.
- **FORGET**: If info is outdated, use \`forget_fact\`.

## STRATEGY
- Don't rely on short-term context.
- Build a persistent knowledge base for the user.
`
}
