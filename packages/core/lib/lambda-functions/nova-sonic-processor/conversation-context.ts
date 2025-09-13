import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export interface ConversationTurn {
  id: string;
  sessionId: string;
  userId: string;
  timestamp: string;
  userInput: {
    type: 'voice' | 'text';
    content: string;
    audioData?: string;
    transcription?: string;
    confidence?: number;
  };
  aiResponse: {
    content: string;
    audioData?: string;
    model: string;
    processingTime: number;
  };
  metadata: {
    language: string;
    audioFormat?: string;
    chunkCount?: number;
    triggerReason?: string;
  };
}

export interface ConversationContext {
  sessionId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  turns: ConversationTurn[];
  summary?: string;
  topics: string[];
  language: string;
  totalTurns: number;
  totalDuration: number;
}

export class ConversationContextManager {
  private readonly tableName: string;
  private contexts: Map<string, ConversationContext> = new Map();

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Initialize conversation context for a new session
   */
  async initializeContext(
    sessionId: string,
    userId: string,
    language: string = 'en-US'
  ): Promise<ConversationContext> {
    const timestamp = new Date().toISOString();
    
    const context: ConversationContext = {
      sessionId,
      userId,
      createdAt: timestamp,
      updatedAt: timestamp,
      turns: [],
      topics: [],
      language,
      totalTurns: 0,
      totalDuration: 0,
    };

    // Store in memory for fast access
    this.contexts.set(sessionId, context);

    // Store in DynamoDB for persistence
    await this.persistContext(context);

    console.log(`Initialized conversation context for session: ${sessionId}`);
    return context;
  }

  /**
   * Add a conversation turn to the context
   */
  async addConversationTurn(
    sessionId: string,
    userInput: ConversationTurn['userInput'],
    aiResponse: ConversationTurn['aiResponse'],
    metadata: ConversationTurn['metadata']
  ): Promise<ConversationTurn> {
    let context = this.contexts.get(sessionId);
    
    if (!context) {
      // Try to load from DynamoDB
      context = await this.loadContext(sessionId);
      if (!context) {
        throw new Error(`No conversation context found for session: ${sessionId}`);
      }
    }

    const turn: ConversationTurn = {
      id: `turn-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      sessionId,
      userId: context.userId,
      timestamp: new Date().toISOString(),
      userInput,
      aiResponse,
      metadata,
    };

    // Add turn to context
    context.turns.push(turn);
    context.totalTurns += 1;
    context.totalDuration += aiResponse.processingTime;
    context.updatedAt = turn.timestamp;

    // Extract topics from the conversation
    await this.updateTopics(context, userInput.content, aiResponse.content);

    // Update in-memory context
    this.contexts.set(sessionId, context);

    // Persist turn to DynamoDB
    await this.persistTurn(turn);
    await this.persistContext(context);

    console.log(`Added conversation turn to session: ${sessionId}, turn: ${turn.id}`);
    return turn;
  }

  /**
   * Get conversation context with recent turns
   */
  async getContext(sessionId: string, maxTurns: number = 10): Promise<ConversationContext | null> {
    let context = this.contexts.get(sessionId);
    
    if (!context) {
      context = await this.loadContext(sessionId);
      if (context) {
        this.contexts.set(sessionId, context);
      }
    }

    if (!context) {
      return null;
    }

    // Return context with limited turns for performance
    return {
      ...context,
      turns: context.turns.slice(-maxTurns),
    };
  }

  /**
   * Get conversation history for AI context
   */
  async getConversationHistory(sessionId: string, maxTurns: number = 5): Promise<string> {
    const context = await this.getContext(sessionId, maxTurns);
    
    if (!context || context.turns.length === 0) {
      return '';
    }

    const history = context.turns.map(turn => {
      return `User: ${turn.userInput.content}\nAssistant: ${turn.aiResponse.content}`;
    }).join('\n\n');

    return `Previous conversation:\n${history}\n\nCurrent conversation:`;
  }

  /**
   * Generate conversation summary
   */
  async generateSummary(sessionId: string): Promise<string> {
    const context = await this.getContext(sessionId);
    
    if (!context || context.turns.length === 0) {
      return 'No conversation to summarize.';
    }

    // Simple summary generation (in real implementation, could use AI)
    const topics = context.topics.join(', ');
    const turnCount = context.turns.length;
    const duration = Math.round(context.totalDuration / 1000);

    return `Conversation summary: Discussed ${topics}. ${turnCount} exchanges over ${duration} seconds.`;
  }

  /**
   * Clean up context when session ends
   */
  async finalizeContext(sessionId: string): Promise<ConversationContext | null> {
    const context = this.contexts.get(sessionId);
    
    if (!context) {
      return null;
    }

    // Generate final summary
    context.summary = await this.generateSummary(sessionId);
    context.updatedAt = new Date().toISOString();

    // Persist final state
    await this.persistContext(context);

    // Remove from memory
    this.contexts.delete(sessionId);

    console.log(`Finalized conversation context for session: ${sessionId}`);
    return context;
  }

  /**
   * Get user's conversation history across sessions
   */
  async getUserConversationHistory(
    userId: string,
    limit: number = 20
  ): Promise<ConversationContext[]> {
    try {
      const result = await docClient.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'UserIdIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
        ScanIndexForward: false, // Most recent first
        Limit: limit,
      }));

      return (result.Items || []) as ConversationContext[];
    } catch (error) {
      console.error(`Error getting user conversation history for ${userId}:`, error);
      return [];
    }
  }

  private async persistContext(context: ConversationContext): Promise<void> {
    try {
      await docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `CONVERSATION#${context.sessionId}`,
          SK: 'METADATA',
          ...context,
        },
      }));
    } catch (error) {
      console.error(`Error persisting context for session ${context.sessionId}:`, error);
    }
  }

  private async persistTurn(turn: ConversationTurn): Promise<void> {
    try {
      await docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `CONVERSATION#${turn.sessionId}`,
          SK: `TURN#${turn.id}`,
          ...turn,
        },
      }));
    } catch (error) {
      console.error(`Error persisting turn ${turn.id}:`, error);
    }
  }

  private async loadContext(sessionId: string): Promise<ConversationContext | null> {
    try {
      // Load context metadata
      const contextResult = await docClient.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `CONVERSATION#${sessionId}`,
          SK: 'METADATA',
        },
      }));

      if (!contextResult.Item) {
        return null;
      }

      // Load conversation turns
      const turnsResult = await docClient.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `CONVERSATION#${sessionId}`,
          ':sk': 'TURN#',
        },
        ScanIndexForward: true, // Chronological order
      }));

      const context = contextResult.Item as ConversationContext;
      context.turns = (turnsResult.Items || []) as ConversationTurn[];

      return context;
    } catch (error) {
      console.error(`Error loading context for session ${sessionId}:`, error);
      return null;
    }
  }

  private async updateTopics(
    context: ConversationContext,
    userInput: string,
    aiResponse: string
  ): Promise<void> {
    // Simple topic extraction (in real implementation, could use NLP)
    const text = `${userInput} ${aiResponse}`.toLowerCase();
    const keywords = [
      'help', 'question', 'problem', 'issue', 'support',
      'information', 'data', 'system', 'application', 'feature',
      'voice', 'audio', 'speech', 'conversation', 'chat',
      'user', 'account', 'profile', 'settings', 'configuration',
    ];

    const foundTopics = keywords.filter(keyword => 
      text.includes(keyword) && !context.topics.includes(keyword)
    );

    context.topics.push(...foundTopics);

    // Limit topics to prevent unbounded growth
    if (context.topics.length > 10) {
      context.topics = context.topics.slice(-10);
    }
  }
}