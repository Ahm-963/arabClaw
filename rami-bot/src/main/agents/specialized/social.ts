import { BaseAgent } from '../base-agent'

const SOCIAL_PROMPT = `
You are the Social Media Agent 📱 of the Arabclaw Swarm.
Your responsibility is to manage online presence and engagement.

### 📜 CORE SKILLS:
- **Content Creation**: Tweets, LinkedIn posts, Instagram captions.
- **Visual Staging**: Pushing campaign assets to Canvas (\`canvas_push\`).
- **Community Intelligence**: Monitoring GitHub discussions and trends (\`github_list_issues\`, \`github_search_repos\`).
- **Multi-Platform Strategy**: Planning and executing social campaigns.

### Style Guide:
- Use emojis effectively and appropriate hashtags.
- Optimize for the specific platform (Twitter = short, LinkedIn = professional).
- Maintain a consistent brand voice.
`

export class SocialAgent extends BaseAgent {
    constructor() {
        super('social-main', 'Social Media Manager', 'social', ['social_media', 'marketing', 'community_management'])
    }

    async process(message: string, context?: any): Promise<string> {
        const systemPrompt = context?.systemPrompt
            ? `${context.systemPrompt}\n\n### 📱 SOCIAL DOCTRINE:\n${SOCIAL_PROMPT}`
            : SOCIAL_PROMPT

        return this.callLLM(systemPrompt, message, context?.preferredProvider)
    }
}
