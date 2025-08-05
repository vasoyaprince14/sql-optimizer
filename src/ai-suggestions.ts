import OpenAI from 'openai';
import { AnalysisResult, AIRecommendation } from './types';

export class AISuggestions {
  private openai: OpenAI | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Get AI-powered recommendations for a query analysis
   */
  async getRecommendations(result: AnalysisResult): Promise<AIRecommendation[]> {
    if (!this.openai) {
      return [];
    }

    try {
      const prompt = this.buildPrompt(result);
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a PostgreSQL performance expert. Analyze the query and provide specific, actionable recommendations for optimization. Focus on:
1. Index strategies
2. Query structure improvements
3. Performance best practices
4. Specific SQL suggestions`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return [];
      }

      return this.parseAIResponse(content);
    } catch (error) {
      console.warn('AI suggestions failed:', error);
      return [];
    }
  }

  /**
   * Build prompt for AI analysis
   */
  private buildPrompt(result: AnalysisResult): string {
    const { query, performance, issues, suggestions } = result;
    
    return `
Analyze this PostgreSQL query and provide optimization recommendations:

QUERY:
${query}

PERFORMANCE METRICS:
- Execution Time: ${performance.executionTime}ms
- Rows Returned: ${performance.rowsReturned}
- Buffer Usage: ${performance.bufferUsage}
- Cache Hit Ratio: ${performance.cacheHitRatio}%

ISSUES DETECTED:
${issues.map(issue => `- ${issue.message}`).join('\n')}

BASIC SUGGESTIONS:
${suggestions.map(s => `- ${s.title}: ${s.description}`).join('\n')}

Please provide specific, actionable recommendations in the following JSON format:
[
  {
    "category": "performance|indexing|query_structure|best_practices",
    "title": "Brief title",
    "description": "Detailed description",
    "reasoning": "Why this helps",
    "confidence": 0.85,
    "implementation": "Specific SQL or code if applicable"
  }
]

Focus on practical, implementable suggestions that will improve query performance.`;
  }

  /**
   * Parse AI response into structured recommendations
   */
  private parseAIResponse(content: string): AIRecommendation[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const recommendations = JSON.parse(jsonMatch[0]);
        return recommendations.map((rec: any) => ({
          category: rec.category || 'performance',
          title: rec.title || 'AI Recommendation',
          description: rec.description || '',
          reasoning: rec.reasoning || '',
          confidence: rec.confidence || 0.5,
          implementation: rec.implementation
        }));
      }

      // Fallback: parse as text and create basic recommendations
      return this.parseTextResponse(content);
    } catch (error) {
      console.warn('Failed to parse AI response:', error);
      return this.parseTextResponse(content);
    }
  }

  /**
   * Parse text response when JSON parsing fails
   */
  private parseTextResponse(content: string): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];
    const lines = content.split('\n').filter(line => line.trim());
    
    let currentRecommendation: Partial<AIRecommendation> = {};
    
    for (const line of lines) {
      if (line.startsWith('-') || line.startsWith('•')) {
        if (currentRecommendation.title) {
          recommendations.push(currentRecommendation as AIRecommendation);
        }
        currentRecommendation = {
          category: 'performance',
          title: line.replace(/^[-•]\s*/, ''),
          description: '',
          reasoning: '',
          confidence: 0.7
        };
      } else if (currentRecommendation.title && line.trim()) {
        currentRecommendation.description = (currentRecommendation.description || '') + ' ' + line.trim();
      }
    }
    
    if (currentRecommendation.title) {
      recommendations.push(currentRecommendation as AIRecommendation);
    }
    
    return recommendations;
  }

  /**
   * Generate index suggestions using AI
   */
  async suggestIndexes(result: AnalysisResult): Promise<AIRecommendation[]> {
    if (!this.openai) {
      return [];
    }

    try {
      const prompt = `
Analyze this PostgreSQL query and suggest specific indexes that would improve performance:

QUERY:
${result.query}

PERFORMANCE ISSUES:
${result.issues.map(issue => `- ${issue.message}`).join('\n')}

Please suggest specific CREATE INDEX statements that would help optimize this query. Focus on:
1. Columns used in WHERE clauses
2. Columns used in JOIN conditions
3. Columns used in ORDER BY
4. Composite indexes for multiple conditions

Provide your response as a list of specific CREATE INDEX statements with explanations.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a PostgreSQL indexing expert. Provide specific CREATE INDEX statements with explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 800
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return [];
      }

      return this.parseIndexSuggestions(content);
    } catch (error) {
      console.warn('AI index suggestions failed:', error);
      return [];
    }
  }

  /**
   * Parse index suggestions from AI response
   */
  private parseIndexSuggestions(content: string): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];
    const lines = content.split('\n');
    
    let currentIndex = '';
    let currentExplanation = '';
    
    for (const line of lines) {
      if (line.includes('CREATE INDEX') || line.includes('create index')) {
        if (currentIndex) {
          recommendations.push({
            category: 'indexing',
            title: 'Index Suggestion',
            description: currentIndex,
            reasoning: currentExplanation,
            confidence: 0.8,
            implementation: currentIndex
          });
        }
        currentIndex = line.trim();
        currentExplanation = '';
      } else if (line.trim() && currentIndex) {
        currentExplanation += line.trim() + ' ';
      }
    }
    
    if (currentIndex) {
      recommendations.push({
        category: 'indexing',
        title: 'Index Suggestion',
        description: currentIndex,
        reasoning: currentExplanation,
        confidence: 0.8,
        implementation: currentIndex
      });
    }
    
    return recommendations;
  }
} 