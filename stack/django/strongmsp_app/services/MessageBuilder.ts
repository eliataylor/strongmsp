import {Message} from "@/services/DeepseekClient";
import {ANALYZE_JOB_RESULTS, BUILD_SEARCH_CRITERIA, SUMMARIZE_CONVO, WAITING_FOR_JOBS} from "@/types/systemPrompts";
import {TheirStackFilters, TheirStackJob, JobListResults} from "@/types/job";
import {ResumeAnalysis, ResumeOccupation, ResumeTechnology, ResumeElement} from "@/services/OnetLookupService";

/***
 * Message Structure and Role Guidelines:
 *
 * SYSTEM_INSTRUCTION: Core AI behavior instructions (role: 'system', no prefix needed)
 * CONTEXT_*: All contextual data provided by the system (role: 'system', prefixed for clarity)
 * - CONTEXT_GUIDING_QUESTION: Previous assistant's guiding question (role: 'assistant')
 * - CONTEXT_USER_PROMPT: Current user's message (role: 'user')
 * - CONTEXT_PREFERRED_MARKETS: User's preferred job locations (role: 'system')
 * - CONTEXT_RESUME_ANALYSIS: User's resume/background data (role: 'system')
 * - CONTEXT_CONVERSATION_SUMMARY: Running conversation summary (role: 'system')
 * - CONTEXT_RECENT_MESSAGES: Recent conversation history (role: 'system')
 * - CONTEXT_PREVIOUS_SEARCH_CRITERIA: Last used job search filters (role: 'system')
 * - CONTEXT_CURRENT_SEARCH_CRITERIA: Current job search filters (role: 'system')
 * - CONTEXT_JOB_RESULTS: Job search results from TheirStack (role: 'system')
 *
 * AI_RESPONSE: AI-generated responses (role: 'assistant')
 * - Loading Message, Job Analysis
 ***/

// Message prefixes for clear identification of contextual data
export const MESSAGE_PREFIXES = {
    CONTEXT_GUIDING_QUESTION: 'CONTEXT_GUIDING_QUESTION:',
    CONTEXT_USER_PROMPT: 'CONTEXT_USER_PROMPT:',
    CONTEXT_PREFERRED_MARKETS: 'CONTEXT_PREFERRED_MARKETS:',
    CONTEXT_RESUME_ANALYSIS: 'CONTEXT_RESUME_ANALYSIS:',
    CONTEXT_CONVERSATION_SUMMARY: 'CONTEXT_CONVERSATION_SUMMARY:',
    CONTEXT_RECENT_MESSAGES: 'CONTEXT_RECENT_MESSAGES:',
    CONTEXT_PREVIOUS_SEARCH_CRITERIA: 'CONTEXT_PREVIOUS_SEARCH_CRITERIA:',
    CONTEXT_CURRENT_SEARCH_CRITERIA: 'CONTEXT_CURRENT_SEARCH_CRITERIA:',
    CONTEXT_JOB_RESULTS: 'CONTEXT_JOB_RESULTS:',
} as const;

export type MessageKeys = 'System Instructions' | 'Guiding Question' | 'User Prompt' | 'Loading Message' |
    'Preferred Markets' | 'Resume Analysis' | 'Conversation Summary' | 'Job Results' | 'Job Analysis'
    | 'Previous Search Criteria' |  'Current Search Criteria' | 'Recent Messages';

class MessageBuilder {
    private messages: Record<string, Message> = {};

    private addMessage(messageKey: MessageKeys, message: Message) {
        this.messages[messageKey] = message;
    }

    // Public methods for each MessageKey with appropriate prefixes
    addSystemInstructions(content: string) {
        this.addMessage('System Instructions', { role: 'system', content });
    }

    addGuidingQuestion(content: string) {
        this.addMessage('Guiding Question', { role: 'assistant', content: `${MESSAGE_PREFIXES.CONTEXT_GUIDING_QUESTION}\n\n${content}` });
    }

    addUserPrompt(content: string) {
        this.addMessage('User Prompt', { role: 'user', content: `${MESSAGE_PREFIXES.CONTEXT_USER_PROMPT}\n\n${content}` });
    }

    addLoadingMessage(content: string) {
        this.addMessage('Loading Message', { role: 'assistant', content });
    }

    addPreferredMarkets(preferredMarkets: string[]) {
        if (preferredMarkets && preferredMarkets.length > 0) {
            const content = `${MESSAGE_PREFIXES.CONTEXT_PREFERRED_MARKETS}\n\n${preferredMarkets.map(market => `- ${market}`).join('\n')}`;
            this.addMessage('Preferred Markets', { role: 'system', content });
        }
    }

    addResumeAnalysis(resumeAnalysis: ResumeAnalysis) {
        const sections: string[] = [];

        if (resumeAnalysis.occupations?.length > 0) {
            sections.push(`**Occupations:**\n${resumeAnalysis.occupations.map((o: ResumeOccupation) => `- ${o.title} (${o.seniority})`).join('\n')}`);
        }
        if (resumeAnalysis.technologies?.length > 0) {
            sections.push(`**Technologies:**\n${resumeAnalysis.technologies.map((t: ResumeTechnology) => `- ${t.title} (${t.seniority})`).join('\n')}`);
        }
        if (resumeAnalysis.elements?.length > 0) {
            sections.push(`**Skills/Elements:**\n${resumeAnalysis.elements.map((e: ResumeElement) => `- ${e.title} (${e.category})`).join('\n')}`);
        }
        if (resumeAnalysis.years_experience) {
            sections.push(`**Years Experience:** ${resumeAnalysis.years_experience}`);
        }
        if (resumeAnalysis.overall_confidence) {
            sections.push(`**Overall Confidence:** ${resumeAnalysis.overall_confidence}%`);
        }

        if (sections.length > 0) {
            this.addMessage('Resume Analysis', { role: 'system', content: `${MESSAGE_PREFIXES.CONTEXT_RESUME_ANALYSIS}\n\n${sections.join('\n\n')}` });
        }

        return sections;
    }

    addConversationSummary(content: string) {
        this.addMessage('Conversation Summary', { role: 'system', content: `${MESSAGE_PREFIXES.CONTEXT_CONVERSATION_SUMMARY}\n\n${content}` });
    }

    addJobResults(jobResults: JobListResults<TheirStackJob> | null) {
        if (jobResults) {
            const content = `${MESSAGE_PREFIXES.CONTEXT_JOB_RESULTS}\n\n${this.formatJobResultsAsMarkdown(jobResults)}`;
            this.addMessage('Job Results', { role: 'system', content });
        } else {
            const content = `${MESSAGE_PREFIXES.CONTEXT_JOB_RESULTS}: No matching jobs found`;
            this.addMessage('Job Results', { role: 'system', content });
        }
    }

    addJobAnalysis(content: string) {
        this.addMessage('Job Analysis', { role: 'assistant', content });
    }

    addPreviousSearchCriteria(previousCriteria: TheirStackFilters) {
        if (previousCriteria) {
            const content = `${MESSAGE_PREFIXES.CONTEXT_PREVIOUS_SEARCH_CRITERIA}\n\n${this.formatSearchCriteriaAsMarkdown(previousCriteria)}`;
            this.addMessage('Previous Search Criteria', { role: 'system', content });
        }
    }

    addCurrentSearchCriteria(currentCriteria: TheirStackFilters) {
        if (currentCriteria) {
            const content = `${MESSAGE_PREFIXES.CONTEXT_CURRENT_SEARCH_CRITERIA}\n\n${this.formatSearchCriteriaAsMarkdown(currentCriteria)}`;
            this.addMessage('Current Search Criteria', { role: 'system', content });
        }
    }

    addRecentMessages(messages: Message[]) {
        if (messages && messages.length > 0) {
            const content = `${MESSAGE_PREFIXES.CONTEXT_RECENT_MESSAGES}\n\n${this.formatRecentMessagesAsMarkdown(messages)}`;
            this.addMessage('Recent Messages', { role: 'system', content });
        }
    }

    getAllMessages(): Message[] {
        return this.getMessages(['System Instructions', 'Guiding Question', 'User Prompt', 'Preferred Markets', 'Conversation Summary', 'Resume Analysis', 'Recent Messages', 'Previous Search Criteria', 'Current Search Criteria', 'Job Results', 'Job Analysis']);
    }

    getMessages(keyOrder: MessageKeys[] = []): Message[] {
        const compiled:Message[] = []
        for (const key of keyOrder) {
            if (this.messages[key] && this.messages[key].content !== '') {
                compiled.push(this.messages[key]);
            }
        }
        return compiled;
    }

    getMessageContent(key: MessageKeys):string {
        return typeof this.messages[key] !== 'undefined' ? this.messages[key].content : '';
    }

    // Helper method to format TheirStack filters as readable markdown
    private formatSearchCriteriaAsMarkdown(criteria: TheirStackFilters): string {
        const sections: string[] = [];

        // Job title filters
        if (criteria.job_title_or?.length) {
            sections.push(`**Job Titles:**\n${criteria.job_title_or.map(title => `- ${title}`).join('\n')}`);
        }
        if (criteria.job_title_not?.length) {
            sections.push(`**Excluded Job Titles:**\n${criteria.job_title_not.map(title => `- ${title}`).join('\n')}`);
        }

        // Location filters
        if (criteria.job_location_pattern_or?.length) {
            sections.push(`**Locations:**\n${criteria.job_location_pattern_or.map(loc => `- ${loc}`).join('\n')}`);
        }
        if (criteria.job_country_code_or?.length) {
            sections.push(`**Countries:**\n${criteria.job_country_code_or.map(country => `- ${country}`).join('\n')}`);
        }

        // Technology filters
        if (criteria.job_technology_slug_or?.length) {
            sections.push(`**Technologies:**\n${criteria.job_technology_slug_or.map(tech => `- ${tech}`).join('\n')}`);
        }
        if (criteria.job_technology_slug_not?.length) {
            sections.push(`**Excluded Technologies:**\n${criteria.job_technology_slug_not.map(tech => `- ${tech}`).join('\n')}`);
        }

        // Employment details
        if (criteria.employment_statuses_or?.length) {
            sections.push(`**Employment Types:**\n${criteria.employment_statuses_or.map(status => `- ${status}`).join('\n')}`);
        }
        if (criteria.job_seniority_or?.length) {
            sections.push(`**Seniority Levels:**\n${criteria.job_seniority_or.map(level => `- ${level}`).join('\n')}`);
        }

        // Work arrangement
        if (criteria.remote !== undefined) {
            sections.push(`**Work Arrangement:** ${criteria.remote ? 'Remote only' : 'On-site only'}`);
        }

        // Salary range
        if (criteria.min_salary_usd || criteria.max_salary_usd) {
            const min = criteria.min_salary_usd ? `$${criteria.min_salary_usd.toLocaleString()}` : 'No minimum';
            const max = criteria.max_salary_usd ? `$${criteria.max_salary_usd.toLocaleString()}` : 'No maximum';
            sections.push(`**Salary Range:** ${min} - ${max}`);
        }

        // Company filters
        if (criteria.company_name_or?.length) {
            sections.push(`**Specific Companies:**\n${criteria.company_name_or.map(company => `- ${company}`).join('\n')}`);
        }
        if (criteria.funding_stage_or?.length) {
            sections.push(`**Company Funding Stages:**\n${criteria.funding_stage_or.map(stage => `- ${stage}`).join('\n')}`);
        }

        // Date filters
        if (criteria.posted_at_max_age_days !== undefined) {
            sections.push(`**Job Age:** Within ${criteria.posted_at_max_age_days} days`);
        }

        return sections.length > 0 ? sections.join('\n\n') : 'No specific criteria set';
    }

    // Helper method to format job results as readable markdown
    private formatJobResultsAsMarkdown(jobResults: JobListResults<TheirStackJob>): string {
        if (!jobResults.jobs || jobResults.jobs.length === 0) {
            return 'No job results found.';
        }

        const jobSummaries = jobResults.jobs.map((job, index) => {
            const details: string[] = [];

            if (job.job_title) details.push(`**Title:** ${job.job_title}`);
            if (job.company_object?.name) details.push(`**Company:** ${job.company_object.name}`);
            if (job.locations?.length) {
                const locationStr = job.locations.map(loc =>
                    [loc.city, loc.state_code, loc.country_code].filter(Boolean).join(', ')
                ).join(' | ');
                if (locationStr) details.push(`**Location:** ${locationStr}`);
            }
            if (job.min_annual_salary_usd || job.max_annual_salary_usd) {
                const min = job.min_annual_salary_usd ? `$${job.min_annual_salary_usd.toLocaleString()}` : 'Not specified';
                const max = job.max_annual_salary_usd ? `$${job.max_annual_salary_usd.toLocaleString()}` : 'Not specified';
                details.push(`**Salary:** ${min} - ${max}`);
            }
            if (job.technology_slugs?.length) {
                details.push(`**Technologies:** ${job.technology_slugs.slice(0, 5).join(', ')}${job.technology_slugs.length > 5 ? '...' : ''}`);
            }
            if (job.employment_statuses?.length) details.push(`**Type:** ${job.employment_statuses.join(', ')}`);
            if (job.seniority) details.push(`**Level:** ${job.seniority}`);

            return `### Job ${index + 1}\n${details.join('\n')}`;
        });

        return `**Total Results:** ${jobResults.jobs.length}\n\n${jobSummaries.join('\n\n')}`;
    }

    // Helper method to format recent messages as readable markdown
    private formatRecentMessagesAsMarkdown(messages: Message[]): string {
        if (!messages || messages.length === 0) {
            return 'No recent messages.';
        }

        return messages.map((msg, index) => {
            const role = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System';
            return `**${role}:** ${msg.content}`;
        }).join('\n\n');
    }

    getMessagesForLoading(): Message[] {
        this.addSystemInstructions(WAITING_FOR_JOBS);
        return this.getMessages(['System Instructions', 'Guiding Question', 'Preferred Markets', 'Conversation Summary', 'User Prompt']);
    }

    getMessagesForSearchCriteria(): Message[] {
        this.addSystemInstructions(BUILD_SEARCH_CRITERIA);
        return this.getMessages(['System Instructions', 'Guiding Question', 'User Prompt', 'Preferred Markets', 'Resume Analysis', 'Conversation Summary', 'Previous Search Criteria']);
    }

    getMessagesForJobAnalysis(): Message[] {
        this.addSystemInstructions(ANALYZE_JOB_RESULTS);
        return this.getMessages(['System Instructions', 'Guiding Question', 'User Prompt', 'Preferred Markets', 'Resume Analysis', 'Conversation Summary', 'Recent Messages', 'Previous Search Criteria', 'Current Search Criteria', 'Job Results']);
    }

    getMessagesForConvoSummary(): Message[] {
        this.addSystemInstructions(SUMMARIZE_CONVO);
        return this.getMessages(['System Instructions', 'Conversation Summary', 'Current Search Criteria', 'Resume Analysis']);
    }

}

export const messageBuilder = new MessageBuilder();
