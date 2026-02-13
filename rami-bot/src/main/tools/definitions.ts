import Anthropic from '@anthropic-ai/sdk'

export const TOOLS: Anthropic.Tool[] = [
    // ============ FILE & CODE TOOLS ============
    {
        name: 'bash',
        description: 'Execute shell commands. On Windows use: dir, type, copy, move, del, findstr, mkdir, rmdir. Use PowerShell for complex operations.',
        input_schema: {
            type: 'object',
            properties: {
                command: { type: 'string', description: 'The command to execute' },
                timeout: { type: 'number', description: 'Timeout in ms (default: 30000)' }
            },
            required: ['command']
        }
    },
    {
        name: 'str_replace_editor',
        description: 'View and edit files. Commands: view (see content), create (new file), str_replace (replace text), insert (add at line).',
        input_schema: {
            type: 'object',
            properties: {
                command: { type: 'string', enum: ['view', 'create', 'str_replace', 'insert'] },
                path: { type: 'string', description: 'Absolute file path' },
                file_text: { type: 'string', description: 'Content for create command' },
                old_str: { type: 'string', description: 'Text to find (str_replace)' },
                new_str: { type: 'string', description: 'Replacement text (str_replace)' },
                insert_line: { type: 'number', description: 'Line number (insert)' },
                view_range: { type: 'array', items: { type: 'number' }, description: '[start, end] lines' }
            },
            required: ['command', 'path']
        }
    },

    // ============ SHARED WORKSPACE (SWARM) ============
    {
        name: 'workspace_add',
        description: 'Add an item to the shared workspace for other agents to access',
        input_schema: {
            type: 'object',
            properties: {
                type: { type: 'string', enum: ['text', 'code', 'file', 'memory'] },
                content: { type: 'string', description: 'Content or file path' },
                metadata: { type: 'object', description: 'Optional metadata' }
            },
            required: ['type', 'content']
        }
    },
    {
        name: 'workspace_read',
        description: 'Read an item from the shared workspace',
        input_schema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Item ID' }
            },
            required: ['id']
        }
    },
    {
        name: 'workspace_list',
        description: 'List items in the shared workspace',
        input_schema: {
            type: 'object',
            properties: {
                type: { type: 'string', description: 'Filter by type (optional)' }
            },
            required: []
        }
    },
    {
        name: 'workspace_update',
        description: 'Update an item in the shared workspace',
        input_schema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Item ID' },
                content: { type: 'string', description: 'New content' }
            },
            required: ['id', 'content']
        }
    },
    {
        name: 'synergy_objective',
        description: 'DELEGATE TO SWARM. Use this for complex, multi-step tasks that require high-level planning and multiple specialists. This triggers the Arabclaw autonomous orchestration system.',
        input_schema: {
            type: 'object',
            properties: {
                objective: { type: 'string', description: 'The high-level objective' }
            },
            required: ['objective']
        }
    },
    {
        name: 'generate_image',
        description: 'Elite Image Generation (NanoBanna). Creates high-impact visual assets based on detailed descriptions.',
        input_schema: {
            type: 'object',
            properties: {
                description: { type: 'string', description: 'Detailed visual description for the image' },
                aspect_ratio: { type: 'string', enum: ['1:1', '16:9', '4:3', '9:16'], description: 'Default is 1:1' }
            },
            required: ['description']
        }
    },

    // ============ WEB TOOLS ============
    {
        name: 'web_search',
        description: 'Search the web for information.',
        input_schema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query' },
                max_results: { type: 'number', description: 'Max results (default: 5)' }
            },
            required: ['query']
        }
    },
    {
        name: 'download_file',
        description: 'Download files from URLs',
        input_schema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to download' },
                filename: { type: 'string', description: 'Custom filename' },
                output_dir: { type: 'string', description: 'Output directory' }
            },
            required: ['url']
        }
    },
    {
        name: 'generate_slides',
        description: 'NANOBANNA PROTOCOL: Create a high-fidelity presentation structure for a given topic.',
        input_schema: {
            type: 'object',
            properties: {
                topic: { type: 'string', description: 'The main subject of the presentation' },
                count: { type: 'number', description: 'Number of slides (default: 5)' }
            },
            required: ['topic']
        }
    },
    {
        name: 'open_url',
        description: 'Open a URL in the default web browser',
        input_schema: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to open' }
            },
            required: ['url']
        }
    },
    {
        name: 'paper_to_code',
        description: 'Elite Paper2Code (DeepCode Protocol). Transforms a research paper (PDF/ArXiv URL) into a functional code implementation. Handles extraction of mathematical logic and algorithmic steps.',
        input_schema: {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'Path to paper or ArXiv/PDF URL' },
                targetLanguage: { type: 'string', enum: ['python', 'typescript', 'javascript', 'cpp'], description: 'Default is python' }
            },
            required: ['source']
        }
    },

    // ============ SCREENSHOT & DISPLAY ============
    {
        name: 'screenshot',
        description: 'Take a screenshot of the screen',
        input_schema: {
            type: 'object',
            properties: {
                output_path: { type: 'string', description: 'Where to save' },
                display_id: { type: 'number', description: 'Display ID' }
            },
            required: []
        }
    },
    {
        name: 'check_screen',
        description: 'CAPTURE VISUAL STATE. Returns a base64 image of the current screen. Essential before any GUI action.',
        input_schema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'analyze_image',
        description: 'Analyze an image or screenshot for objects, text, or UI elements.',
        input_schema: {
            type: 'object',
            properties: {
                imageData: { type: 'string', description: 'Base64 encoded image data' },
                analysisTypes: {
                    type: 'array',
                    items: { type: 'string', enum: ['ocr', 'objects', 'ui-elements', 'layout'] },
                    description: 'Types of analysis to perform'
                }
            },
            required: ['imageData', 'analysisTypes']
        }
    },

    // ============ DOCUMENT ANALYSIS ============
    {
        name: 'doc_analyze',
        description: 'Perform advanced analysis on a document (PDF, Word, etc.)',
        input_schema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Path to the document' },
                options: { type: 'object', description: 'Analysis options' }
            },
            required: ['path']
        }
    },
    {
        name: 'doc_extract_text',
        description: 'Extract all text from a document',
        input_schema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Path to the document' }
            },
            required: ['path']
        }
    },
    {
        name: 'doc_compare',
        description: 'Compare two documents and identify differences',
        input_schema: {
            type: 'object',
            properties: {
                path1: { type: 'string', description: 'Path to first document' },
                path2: { type: 'string', description: 'Path to second document' }
            },
            required: ['path1', 'path2']
        }
    },
    {
        name: 'doc_analyze_rfp',
        description: 'Specialized analysis of an RFP (Request for Proposal) document',
        input_schema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Path to the RFP document' }
            },
            required: ['path']
        }
    },

    {
        name: 'run_code',
        description: 'Execute code in a specific language.',
        input_schema: {
            type: 'object',
            properties: {
                language: { type: 'string', enum: ['python', 'javascript', 'powershell', 'shell'] },
                code: { type: 'string', description: 'The code to run' }
            },
            required: ['language', 'code']
        }
    },
    {
        name: 'install_package',
        description: 'Install a package/library.',
        input_schema: {
            type: 'object',
            properties: {
                language: { type: 'string', enum: ['python', 'javascript'] },
                package_name: { type: 'string' }
            },
            required: ['language', 'package_name']
        }
    },

    // ============ COMPUTER CONTROL ============
    {
        name: 'mouse_move',
        description: 'Move the mouse cursor',
        input_schema: {
            type: 'object',
            properties: {
                x: { type: 'number' },
                y: { type: 'number' }
            },
            required: ['x', 'y']
        }
    },
    {
        name: 'mouse_click',
        description: 'Click the mouse button',
        input_schema: {
            type: 'object',
            properties: {
                button: { type: 'string', enum: ['left', 'right', 'middle'] },
                x: { type: 'number' },
                y: { type: 'number' }
            },
            required: []
        }
    },
    {
        name: 'mouse_drag',
        description: 'Drag from one coordinate to another',
        input_schema: {
            type: 'object',
            properties: {
                fromX: { type: 'number' },
                fromY: { type: 'number' },
                toX: { type: 'number' },
                toY: { type: 'number' }
            },
            required: ['fromX', 'fromY', 'toX', 'toY']
        }
    },
    {
        name: 'mouse_double_click',
        description: 'Double-click the left mouse button',
        input_schema: {
            type: 'object',
            properties: {
                x: { type: 'number' },
                y: { type: 'number' }
            },
            required: []
        }
    },
    {
        name: 'type_text',
        description: 'Type text using the keyboard',
        input_schema: {
            type: 'object',
            properties: {
                text: { type: 'string' }
            },
            required: ['text']
        }
    },
    {
        name: 'press_key',
        description: 'Press a keyboard key',
        input_schema: {
            type: 'object',
            properties: {
                key: { type: 'string' }
            },
            required: ['key']
        }
    },
    {
        name: 'hotkey',
        description: 'Press a keyboard shortcut',
        input_schema: {
            type: 'object',
            properties: {
                keys: { type: 'array', items: { type: 'string' } }
            },
            required: ['keys']
        }
    },
    {
        name: 'wait',
        description: 'Wait for a specified duration (ms).',
        input_schema: {
            type: 'object',
            properties: {
                duration: { type: 'number' }
            },
            required: ['duration']
        }
    },

    // ============ PROCESS MANAGEMENT ============
    {
        name: 'start_process',
        description: 'Start/launch a program',
        input_schema: {
            type: 'object',
            properties: {
                command: { type: 'string' }
            },
            required: ['command']
        }
    },
    {
        name: 'kill_process',
        description: 'Kill a process by name',
        input_schema: {
            type: 'object',
            properties: {
                name: { type: 'string' }
            },
            required: ['name']
        }
    },

    // ============ SYSTEM INFO ============
    {
        name: 'get_current_time',
        description: 'Get current date, time, and timezone',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'get_weather',
        description: 'Get weather information',
        input_schema: {
            type: 'object',
            properties: {
                city: { type: 'string' }
            },
            required: []
        }
    },

    // ============ NOTIFICATIONS & SPEECH ============
    {
        name: 'show_notification',
        description: 'Show a desktop notification',
        input_schema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                body: { type: 'string' }
            },
            required: ['title', 'body']
        }
    },
    {
        name: 'speak',
        description: 'Speak text aloud.',
        input_schema: {
            type: 'object',
            properties: {
                text: { type: 'string' },
                voice: { type: 'string' },
                rate: { type: 'number' },
                volume: { type: 'number' }
            },
            required: ['text']
        }
    },

    // ============ EMAIL TOOLS ============
    {
        name: 'email_send',
        description: 'Send an email.',
        input_schema: {
            type: 'object',
            properties: {
                to: { type: 'string' },
                subject: { type: 'string' },
                body: { type: 'string' },
                cc: { type: 'string' },
                html: { type: 'boolean' }
            },
            required: ['to', 'subject', 'body']
        }
    },
    {
        name: 'email_list',
        description: 'List recent emails.',
        input_schema: {
            type: 'object',
            properties: {
                query: { type: 'string' },
                max_results: { type: 'number' }
            },
            required: []
        }
    },
    {
        name: 'email_read',
        description: 'Read a specific email by ID.',
        input_schema: {
            type: 'object',
            properties: {
                message_id: { type: 'string' }
            },
            required: ['message_id']
        }
    },

    // ============ MEMORY & LEARNING ============
    {
        name: 'remember_fact',
        description: 'Store a fact in long-term memory',
        input_schema: {
            type: 'object',
            properties: {
                fact: { type: 'string' },
                category: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } }
            },
            required: ['fact']
        }
    },
    {
        name: 'learn_preference',
        description: 'Learn a specific user preference, name, or goal',
        input_schema: {
            type: 'object',
            properties: {
                key: { type: 'string', description: 'The preference key (e.g. user_name, user_origin, user_tasks)' },
                value: { type: 'string', description: 'The value of the preference' }
            },
            required: ['key', 'value']
        }
    },
    {
        name: 'recall_memories',
        description: 'Search memories for relevant context',
        input_schema: {
            type: 'object',
            properties: {
                query: { type: 'string' },
                limit: { type: 'number' }
            },
            required: ['query']
        }
    },

    // ============ GITHUB TOOLS ============
    {
        name: 'github_get_user',
        description: 'Get details about the authenticated GitHub user',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'github_list_repos',
        description: 'List GitHub repositories for a user',
        input_schema: {
            type: 'object',
            properties: {
                username: { type: 'string', description: 'Username (optional, defaults to authenticated user)' }
            },
            required: []
        }
    },
    {
        name: 'github_get_repo',
        description: 'Get details about a specific GitHub repository',
        input_schema: {
            type: 'object',
            properties: {
                owner: { type: 'string' },
                repo: { type: 'string' }
            },
            required: ['owner', 'repo']
        }
    },
    {
        name: 'github_create_repo',
        description: 'Create a new GitHub repository',
        input_schema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                options: {
                    type: 'object',
                    properties: {
                        description: { type: 'string' },
                        private: { type: 'boolean' },
                        auto_init: { type: 'boolean' }
                    }
                }
            },
            required: ['name']
        }
    },
    {
        name: 'github_get_contents',
        description: 'Get contents of a file or directory in a GitHub repo',
        input_schema: {
            type: 'object',
            properties: {
                owner: { type: 'string' },
                repo: { type: 'string' },
                path: { type: 'string', description: 'File or directory path' }
            },
            required: ['owner', 'repo', 'path']
        }
    },
    {
        name: 'github_create_file',
        description: 'Create or update a file in a GitHub repository',
        input_schema: {
            type: 'object',
            properties: {
                owner: { type: 'string' },
                repo: { type: 'string' },
                path: { type: 'string' },
                content: { type: 'string' },
                message: { type: 'string', description: 'Commit message' },
                sha: { type: 'string', description: 'Required for updates' }
            },
            required: ['owner', 'repo', 'path', 'content', 'message']
        }
    },
    {
        name: 'github_create_issue',
        description: 'Create a new issue on GitHub',
        input_schema: {
            type: 'object',
            properties: {
                owner: { type: 'string' },
                repo: { type: 'string' },
                title: { type: 'string' },
                body: { type: 'string' },
                labels: { type: 'array', items: { type: 'string' } }
            },
            required: ['owner', 'repo', 'title']
        }
    },
    {
        name: 'github_list_issues',
        description: 'List issues in a GitHub repository',
        input_schema: {
            type: 'object',
            properties: {
                owner: { type: 'string' },
                repo: { type: 'string' },
                options: {
                    type: 'object',
                    properties: {
                        state: { type: 'string', enum: ['open', 'closed', 'all'] }
                    }
                }
            },
            required: ['owner', 'repo']
        }
    },
    {
        name: 'github_create_pr',
        description: 'Create a new Pull Request on GitHub',
        input_schema: {
            type: 'object',
            properties: {
                owner: { type: 'string' },
                repo: { type: 'string' },
                title: { type: 'string' },
                head: { type: 'string', description: 'The name of the branch where your changes are implemented' },
                base: { type: 'string', description: 'The name of the branch you want the changes pulled into' },
                body: { type: 'string' }
            },
            required: ['owner', 'repo', 'title', 'head', 'base']
        }
    },
    {
        name: 'github_trigger_workflow',
        description: 'Trigger a GitHub Actions workflow',
        input_schema: {
            type: 'object',
            properties: {
                owner: { type: 'string' },
                repo: { type: 'string' },
                workflow_id: { type: 'string', description: 'The ID or filename of the workflow' },
                ref: { type: 'string', description: 'The branch or tag name' },
                inputs: { type: 'object', description: 'Optional inputs' }
            },
            required: ['owner', 'repo', 'workflow_id', 'ref']
        }
    },
    {
        name: 'github_merge_pr',
        description: 'Merge a GitHub Pull Request',
        input_schema: {
            type: 'object',
            properties: {
                owner: { type: 'string' },
                repo: { type: 'string' },
                pr_number: { type: 'number' },
                commit_message: { type: 'string' }
            },
            required: ['owner', 'repo', 'pr_number']
        }
    },

    // ============ SOCIAL MEDIA TOOLS ============
    {
        name: 'twitter_post',
        description: 'Post a tweet to Twitter/X',
        input_schema: {
            type: 'object',
            properties: {
                text: { type: 'string' }
            },
            required: ['text']
        }
    },
    {
        name: 'twitter_search',
        description: 'Search for tweets on Twitter/X',
        input_schema: {
            type: 'object',
            properties: {
                query: { type: 'string' },
                max_results: { type: 'number' }
            },
            required: ['query']
        }
    },
    {
        name: 'linkedin_post',
        description: 'Post an update to LinkedIn',
        input_schema: {
            type: 'object',
            properties: {
                text: { type: 'string' }
            },
            required: ['text']
        }
    },

    // ============ CLOUD & COMMUNICATION TOOLS ============
    {
        name: 'slack_send',
        description: 'Send a message to a Slack channel',
        input_schema: {
            type: 'object',
            properties: {
                channel: { type: 'string', description: 'Channel ID or name' },
                text: { type: 'string' }
            },
            required: ['channel', 'text']
        }
    },
    {
        name: 'discord_send',
        description: 'Send a message to a Discord channel',
        input_schema: {
            type: 'object',
            properties: {
                channel_id: { type: 'string' },
                content: { type: 'string' }
            },
            required: ['channel_id', 'content']
        }
    },
    {
        name: 'vision_grounding',
        description: 'Find coordinates (X, Y) of a UI element on the screen using a visual description (e.g. "search button", "red close icon"). Uses VLM-powered visual grounding.',
        input_schema: {
            type: 'object',
            properties: {
                description: { type: 'string', description: 'Natural language description of the element to find' },
                context: { type: 'string', description: 'Additional context about what the user is trying to do' }
            },
            required: ['description']
        }
    },
    {
        name: 'get_ui_tree',
        description: 'Get the accessibility tree (UI Automation) of the current screen. Returns interactive elements with their roles and coordinates. Useful for "Hybrid Grounding".',
        input_schema: {
            type: 'object',
            properties: {
                depth: { type: 'number', description: 'Maximum depth to search (default: 2)' }
            },
            required: []
        }
    },
    {
        name: 'wait_for_quiet',
        description: 'Wait for the screen to stop animating or changing. Useful after clicks or page loads.',
        input_schema: {
            type: 'object',
            properties: {
                timeout: { type: 'number', description: 'Max time to wait in ms (default: 5000)' }
            },
            required: []
        }
    },
    {
        name: 'notion_list_db',
        description: 'List Notion databases',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'trello_create_card',
        description: 'Create a card in Trello',
        input_schema: {
            type: 'object',
            properties: {
                list_id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' }
            },
            required: ['list_id', 'name']
        }
    },

    // ============ PAYMENT TOOLS ============
    {
        name: 'stripe_get_balance',
        description: 'Get Stripe account balance',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'stripe_list_customers',
        description: 'List Stripe customers',
        input_schema: {
            type: 'object',
            properties: {
                limit: { type: 'number' }
            },
            required: []
        }
    },
    {
        name: 'git_status',
        description: 'Check git status of the current project',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'git_commit',
        description: 'Commit changes with a message',
        input_schema: {
            type: 'object',
            properties: {
                message: { type: 'string' }
            },
            required: ['message']
        }
    },
    {
        name: 'git_push',
        description: 'Push changes to remote repository',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'git_pull',
        description: 'Pull latest changes from remote repository',
        input_schema: { type: 'object', properties: {}, required: [] }
    },

    // ============ SYSTEM INTELLIGENCE & AUDIT TOOLS ============
    {
        name: 'audit_get_stats',
        description: 'Get statistics from the system audit log',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'rollback_list',
        description: 'List available system rollbacks/backups',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'rollback_perform',
        description: 'Perform a system rollback to a specific entry ID (Warning: Destructive!)',
        input_schema: {
            type: 'object',
            properties: {
                entry_id: { type: 'string' }
            },
            required: ['entry_id']
        }
    },
    {
        name: 'qa_get_failures',
        description: 'Get recent task failures and their QA scores',
        input_schema: {
            type: 'object',
            properties: {
                min_score: { type: 'number', description: 'Minimum score threshold (0-1)' },
                limit: { type: 'number' }
            },
            required: []
        }
    },
    {
        name: 'pattern_get_all',
        description: 'Get identified failure patterns from the system',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'playbook_get_all',
        description: 'Get all active system playbooks and strategies',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'system_run_check',
        description: 'Run a complete Soul Upgrade 2.0 system check',
        input_schema: { type: 'object', properties: {}, required: [] }
    }
];
