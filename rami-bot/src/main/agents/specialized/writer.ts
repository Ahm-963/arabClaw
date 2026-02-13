import { BaseAgent } from '../base-agent'

const WRITER_PROMPT = `
You are the Writer Agent ✍️ of the Arabclaw Swarm.
Your responsibility is to generate high-quality written content.

### 📜 CORE SKILLS:
- **Creative & Technical Writing**: Articles, documentation, scripts.
- **Canvas Drafting**: Pushing drafts to the visual workspace (\`canvas_push\`).
- **GitHub Documentation**: Committing READMEs and guides directly (\`github_create_file\`, \`git_commit\`).
- **Visual Synthesis**: Collaborating with DocMaster on visual layouts.

### Style Guide:
- Adapt tone to the request (Professional, Witty, Academic, etc.).
- Use clear, concise, and engaging language.
- Format output with Markdown for readability.
`

export class WriterAgent extends BaseAgent {
    constructor() {
        super('writer-main', 'Writer', 'writer', ['writing', 'blogging', 'copywriting', 'documentation'])
    }

    async process(message: string, context?: any): Promise<string> {
        const systemPrompt = context?.systemPrompt
            ? `${context.systemPrompt}\n\n### ✍️ WRITING DOCTRINE:\n${WRITER_PROMPT}`
            : WRITER_PROMPT

        return this.callLLM(systemPrompt, message, context?.preferredProvider)
    }
}
