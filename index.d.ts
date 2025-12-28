// Type definitions for @mathieuc/tradingview
// Project: https://github.com/mrme000m/tvjs
// Definitions by: TradingView API Contributors

/// <reference types="node" />

export = TradingView;

declare namespace TradingView {
  // ==================== Error Classes ====================
  
  export class TradingViewAPIError extends Error {
    type: string;
    details: any;
    constructor(message: string, type?: string, details?: any);
  }

  export class ConnectionError extends TradingViewAPIError {
    constructor(message: string, details?: any);
  }

  export class ProtocolError extends TradingViewAPIError {
    constructor(message: string, details?: any);
  }

  export class ValidationError extends TradingViewAPIError {
    field: string | null;
    constructor(message: string, field?: string | null, details?: any);
  }

  export class AuthenticationError extends TradingViewAPIError {
    constructor(message: string, details?: any);
  }

  export class SymbolError extends TradingViewAPIError {
    symbol: string | null;
    constructor(message: string, symbol?: string | null, details?: any);
  }

  export class IndicatorError extends TradingViewAPIError {
    indicatorId: string | null;
    constructor(message: string, indicatorId?: string | null, details?: any);
  }

  export class SessionError extends TradingViewAPIError {
    constructor(message: string, details?: any);
  }

  export const errors: {
    TradingViewAPIError: typeof TradingViewAPIError;
    ConnectionError: typeof ConnectionError;
    ProtocolError: typeof ProtocolError;
    ValidationError: typeof ValidationError;
    AuthenticationError: typeof AuthenticationError;
    SymbolError: typeof SymbolError;
    IndicatorError: typeof IndicatorError;
    SessionError: typeof SessionError;
  };

  // ==================== Configuration ====================

  export function setDebug(value: boolean): void;
  export function isDebugEnabled(): boolean;

  // ==================== Types ====================

  export type Timezone = 
    | 'Etc/UTC' | 'exchange'
    | 'Pacific/Honolulu' | 'America/Juneau' | 'America/Los_Angeles'
    | 'America/Phoenix' | 'America/Vancouver' | 'US/Mountain'
    | 'America/El_Salvador' | 'America/Bogota' | 'America/Chicago'
    | 'America/Lima' | 'America/Mexico_City' | 'America/Caracas'
    | 'America/New_York' | 'America/Toronto' | 'America/Argentina/Buenos_Aires'
    | 'America/Santiago' | 'America/Sao_Paulo' | 'Atlantic/Reykjavik'
    | 'Europe/Dublin' | 'Africa/Lagos' | 'Europe/Lisbon' | 'Europe/London'
    | 'Europe/Amsterdam' | 'Europe/Belgrade' | 'Europe/Berlin'
    | 'Europe/Brussels' | 'Europe/Copenhagen' | 'Africa/Johannesburg'
    | 'Africa/Cairo' | 'Europe/Luxembourg' | 'Europe/Madrid' | 'Europe/Malta'
    | 'Europe/Oslo' | 'Europe/Paris' | 'Europe/Rome' | 'Europe/Stockholm'
    | 'Europe/Warsaw' | 'Europe/Zurich' | 'Europe/Athens' | 'Asia/Bahrain'
    | 'Europe/Helsinki' | 'Europe/Istanbul' | 'Asia/Jerusalem' | 'Asia/Kuwait'
    | 'Europe/Moscow' | 'Asia/Qatar' | 'Europe/Riga' | 'Asia/Riyadh'
    | 'Europe/Tallinn' | 'Europe/Vilnius' | 'Asia/Tehran' | 'Asia/Dubai'
    | 'Asia/Muscat' | 'Asia/Ashkhabad' | 'Asia/Kolkata' | 'Asia/Almaty'
    | 'Asia/Bangkok' | 'Asia/Jakarta' | 'Asia/Ho_Chi_Minh' | 'Asia/Chongqing'
    | 'Asia/Hong_Kong' | 'Australia/Perth' | 'Asia/Shanghai' | 'Asia/Singapore'
    | 'Asia/Taipei' | 'Asia/Seoul' | 'Asia/Tokyo' | 'Australia/Brisbane'
    | 'Australia/Adelaide' | 'Australia/Sydney' | 'Pacific/Norfolk'
    | 'Pacific/Auckland' | 'Pacific/Fakaofo' | 'Pacific/Chatham';

  export type TimeFrame = 
    | '1' | '3' | '5' | '15' | '30' | '45'
    | '60' | '120' | '180' | '240'
    | '1D' | '1W' | '1M'
    | 'D' | 'W' | 'M';

  export type ChartType = 
    | 'HeikinAshi' | 'Renko' | 'LineBreak' 
    | 'Kagi' | 'PointAndFigure' | 'Range';

  export interface PricePeriod {
    time: number;
    open: number;
    close: number;
    max: number;
    min: number;
    volume: number;
  }

  export interface MarketInfos {
    series_id: string;
    base_currency: string;
    base_currency_id: string;
    name: string;
    full_name: string;
    pro_name: string;
    description: string;
    short_description: string;
    exchange: string;
    listed_exchange: string;
    provider_id: string;
    currency_id: string;
    currency_code: string;
    variable_tick_size: string;
    pricescale: number;
    pointvalue: number;
    session: string;
    session_display: string;
    type: string;
    has_intraday: boolean;
    fractional: boolean;
    is_tradable: boolean;
    minmov: number;
    minmove2: number;
    timezone: string;
    is_replayable: boolean;
    has_adjustment: boolean;
    has_extended_hours: boolean;
    bar_source: string;
    bar_transform: string;
    bar_fillgaps: boolean;
    allowed_adjustment: string;
    subsession_id: string;
    pro_perm: string;
    base_name: any[];
    legs: any[];
    subsessions: any[];
    typespecs: any[];
    resolutions: any[];
    aliases: any[];
    alternatives: any[];
  }

  // ==================== Client ====================

  export interface ClientOptions {
    token?: string;
    signature?: string;
    debug?: boolean;
    DEBUG?: boolean; // Legacy support
    server?: 'data' | 'prodata' | 'widgetdata';
    location?: string;
    reconnectAttempts?: number;
    reconnectDelay?: number;
    connectionTimeout?: number;
    pingTimeout?: number;
  }

  export interface SocketSession {
    session_id: string;
    timestamp: number;
    timestampMs: number;
    release: string;
    studies_metadata_hash: string;
    protocol: 'json' | string;
    javastudies: string;
    auth_scheme_vsn: number;
    via: string;
  }

  export class Client {
    constructor(options?: ClientOptions);
    
    get isLogged(): boolean;
    get isOpen(): boolean;

    onConnected(callback: () => void): () => void;
    onDisconnected(callback: () => void): () => void;
    onLogged(callback: (session: SocketSession) => void): () => void;
    onPing(callback: (i: number) => void): () => void;
    onData(callback: (...data: any[]) => void): () => void;
    onError(callback: (error: Error, ...msgs: any[]) => void): () => void;
    onEvent(callback: (event: string, ...data: any[]) => void): () => void;

    send(type: string, params?: any[]): void;
    sendQueue(): void;
    end(): Promise<void>;

    Session: {
      Chart: typeof ChartSession;
      Quote: typeof QuoteSession;
    };
  }

  // ==================== Chart Session ====================

  export interface ChartOptions {
    timeframe?: TimeFrame;
    range?: number;
    to?: number;
    adjustment?: 'splits' | 'dividends';
    backadjustment?: boolean;
    session?: 'regular' | 'extended';
    currency?: string;
    type?: ChartType;
    inputs?: Record<string, any>;
    replay?: number;
  }

  export class ChartSession {
    constructor();

    get periods(): PricePeriod[];
    get infos(): MarketInfos;

    setMarket(symbol: string, options?: ChartOptions): void;
    setSeries(timeframe?: TimeFrame, range?: number, reference?: number | null): void;
    setTimezone(timezone: Timezone): void;
    fetchMore(number?: number): void;
    
    replayStep(number?: number): Promise<void>;
    replayStart(interval?: number): Promise<void>;
    replayStop(): Promise<void>;

    onSymbolLoaded(callback: () => void): () => void;
    onUpdate(callback: (changes: string[]) => void): () => void;
    onReplayLoaded(callback: () => void): () => void;
    onReplayResolution(callback: (timeframe: TimeFrame, index: number) => void): () => void;
    onReplayEnd(callback: () => void): () => void;
    onReplayPoint(callback: (index: number) => void): () => void;
    onError(callback: (error: Error, ...msgs: any[]) => void): () => void;

    delete(): void;

    Study: typeof ChartStudy;
  }

  // ==================== Chart Study ====================

  export class ChartStudy {
    constructor(indicator: PineIndicator | BuiltInIndicator);

    instance: PineIndicator | BuiltInIndicator;
    get periods(): any[];
    get graphic(): any;
    get strategyReport(): any;

    setIndicator(indicator: PineIndicator | BuiltInIndicator): void;
    
    onReady(callback: () => void): () => void;
    onUpdate(callback: (changes: string[]) => void): () => void;
    onError(callback: (error: Error, ...msgs: any[]) => void): () => void;

    remove(): void;
  }

  // ==================== Quote Session ====================

  export interface QuoteSessionOptions {
    fields?: 'all' | 'price';
    customFields?: string[];
  }

  export class QuoteSession {
    constructor(options?: QuoteSessionOptions);

    delete(): void;

    Market: typeof QuoteMarket;
  }

  // ==================== Quote Market ====================

  export class QuoteMarket {
    constructor(symbol: string, session?: string);

    onLoaded(callback: () => void): () => void;
    onData(callback: (data: Record<string, any>) => void): () => void;
    onEvent(callback: (...args: any[]) => void): () => void;
    onError(callback: (error: Error, ...msgs: any[]) => void): () => void;

    close(): void;
  }

  // ==================== Indicators ====================

  export interface IndicatorInput {
    name: string;
    inline: string;
    internalID?: string;
    tooltip?: string;
    type: 'text' | 'source' | 'integer' | 'float' | 'resolution' | 'bool' | 'color';
    value: string | number | boolean;
    isHidden: boolean;
    isFake: boolean;
    options?: string[];
  }

  export class PineIndicator {
    constructor(options: {
      pineId: string;
      pineVersion: string;
      description: string;
      shortDescription: string;
      inputs: Record<string, IndicatorInput>;
      plots: Record<string, string>;
      script: string;
    });

    get pineId(): string;
    get pineVersion(): string;
    get description(): string;
    get shortDescription(): string;
    get inputs(): Record<string, IndicatorInput>;
    get plots(): Record<string, string>;
    get type(): string;
    get script(): string;

    setType(type: 'Script@tv-scripting-101!' | 'StrategyScript@tv-scripting-101!'): void;
    setOption(key: number | string, value: any): void;
  }

  export type BuiltInIndicatorType = 
    | 'Volume@tv-basicstudies-241'
    | 'VbPFixed@tv-basicstudies-241'
    | 'VbPFixed@tv-basicstudies-241!'
    | 'VbPFixed@tv-volumebyprice-53!'
    | 'VbPSessions@tv-volumebyprice-53'
    | 'VbPSessionsRough@tv-volumebyprice-53!'
    | 'VbPSessionsDetailed@tv-volumebyprice-53!'
    | 'VbPVisible@tv-volumebyprice-53';

  export class BuiltInIndicator {
    constructor(type: BuiltInIndicatorType);

    get type(): BuiltInIndicatorType;
    get options(): Record<string, any>;

    setOption(key: string, value: any, force?: boolean): void;
  }

  // ==================== Pine Permission Manager ====================

  export interface AuthorizationUser {
    id: number;
    username: string;
    userpic: string;
    expiration: string;
    created: string;
  }

  export class PinePermManager {
    constructor(sessionId: string, signature: string, pineId: string);

    getUsers(limit?: number, order?: string): Promise<AuthorizationUser[]>;
    addUser(username: string, expiration?: Date | null): Promise<'ok' | 'exists' | null>;
    modifyExpiration(username: string, expiration?: Date | null): Promise<'ok' | null>;
    removeUser(username: string): Promise<'ok' | null>;
  }

  // ==================== Misc Requests ====================

  export interface SearchMarketResult {
    id: string;
    exchange: string;
    fullExchange: string;
    symbol: string;
    description: string;
    type: string;
    getTA: () => Promise<any>;
  }

  export interface SearchIndicatorResult {
    id: string;
    version: string;
    name: string;
    author: {
      id: number;
      username: string;
    };
    image: string;
    source: string;
    type: 'study' | 'strategy';
    access: 'open_source' | 'closed_source' | 'invite_only' | 'private' | 'other';
    get: () => Promise<PineIndicator>;
  }

  export interface User {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    reputation: number;
    following: number;
    followers: number;
    notifications: {
      user: number;
      following: number;
    };
    session: string;
    signature: string;
    sessionHash: string;
    privateChannel: string;
    authToken: string;
    joinDate: Date;
  }

  export interface UserCredentials {
    id: number;
    session: string;
    signature?: string;
  }

  export function getTA(id: string): Promise<any>;
  export function searchMarket(search: string, filter?: string): Promise<SearchMarketResult[]>;
  export function searchMarketV3(search: string, filter?: string, offset?: number): Promise<SearchMarketResult[]>;
  export function searchIndicator(search?: string): Promise<SearchIndicatorResult[]>;
  export function getIndicator(id: string, version?: string, session?: string, signature?: string): Promise<PineIndicator>;
  export function loginUser(username: string, password: string, remember?: boolean, userAgent?: string): Promise<User>;
  export function getUser(session: string, signature?: string, location?: string): Promise<User>;
  export function getPrivateIndicators(session: string, signature?: string): Promise<SearchIndicatorResult[]>;
  export function getChartToken(layout: string, credentials?: UserCredentials): Promise<string>;
  export function getDrawings(layout: string, symbol?: string, credentials?: UserCredentials, chartID?: string): Promise<any[]>;
}
