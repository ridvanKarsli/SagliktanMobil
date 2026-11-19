// SagliktanApi DTO şekilleri (bkz. SagliktanApi/.../dto).

export type CommunityRole = 'PATIENT' | 'CAREGIVER' | 'PROFESSIONAL' | 'OTHER';
export type ReactionValue = 'HELPFUL' | 'NOT_HELPFUL';
export type PostType = 'DISCUSSION' | 'QUESTION' | 'POLL';
export type PostSort = 'RECENT' | 'POPULAR';

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  bio: string | null;
  role: 'USER' | 'ADMIN';
  emailVerified: boolean;
  createdAt: string;
  postCount: number;
  commentCount: number;
  likesReceived: number;
  dislikesReceived: number;
  helpedPeople: number;
  communityRole: CommunityRole | null;
  city: string | null;
  discoverable: boolean;
  profilePublic: boolean;
  onboardingCompleted: boolean;
  weeklyDigestEnabled: boolean;
  // KVKK: geçerli sürüme verilmiş sağlık verisi açık rızası
  healthConsent: boolean;
}

export interface DiseaseGroup {
  id: number;
  name: string;
  description: string | null;
  memberCount: number;
  createdAt: string;
}

export interface SubGroup {
  id: number;
  diseaseGroupId: number;
  name: string;
  description: string | null;
  postCount: number;
  createdAt: string;
}

export interface PollOption {
  id: number;
  label: string;
  votes: number;
}

export interface Poll {
  options: PollOption[];
  totalVotes: number;
  myOptionId: number | null;
}

export interface Post {
  id: number;
  subGroupId: number;
  diseaseGroupId: number | null;
  subGroupName: string | null;
  diseaseGroupName: string | null;
  authorId: number;
  authorName: string;
  title: string;
  content: string;
  helpfulCount: number;
  notHelpfulCount: number;
  myReaction: ReactionValue | null;
  saved: boolean;
  savedCount: number;
  attachments: { id: number; url: string; sortOrder: number }[];
  flaggedSensitive: boolean;
  pinned: boolean;
  postType: PostType;
  acceptedCommentId: number | null;
  commentCount: number;
  poll: Poll | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface Comment {
  id: number;
  postId: number;
  authorId: number;
  authorName: string;
  content: string;
  deleted: boolean;
  parentCommentId: number | null;
  helpfulCount: number;
  notHelpfulCount: number;
  myReaction: ReactionValue | null;
  flaggedSensitive: boolean;
  createdAt: string;
  replyCount: number;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  kvkkConsent: boolean;
  healthConsent: boolean;
  city?: string | null;
  communityRole?: CommunityRole | null;
}

export interface UserCard {
  id: number;
  firstName: string;
  lastName: string;
  bio: string | null;
  postCount: number;
  commentCount: number;
  likesReceived: number;
  dislikesReceived: number;
  helpedPeople: number;
  communityRole: CommunityRole | null;
  city: string | null;
  profileHidden: boolean;
}

export interface SearchResult {
  posts: Post[];
  comments: Comment[];
  users: UserCard[];
}

export type NotificationType = 'NEW_COMMENT' | 'COMMENT_REPLY' | 'ANSWER_ACCEPTED';

export interface AppNotification {
  id: number;
  type: NotificationType;
  actorId: number;
  actorName: string;
  postId: number | null;
  commentId: number | null;
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  id: number;
  otherUserId: number;
  otherUserName: string;
  lastMessagePreview: string | null;
  lastMessageHasAttachment: boolean;
  lastMessageHasSharedPost: boolean;
  lastMessageAt: string;
  unreadCount: number;
  canMessage: boolean;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  content: string | null;
  attachmentUrl: string | null;
  sharedPost: SharedPostPreview | null;
  readAt: string | null;
  createdAt: string;
}

export type MessageRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface MessageRequest {
  id: number;
  senderId: number;
  senderName: string;
  recipientId: number;
  recipientName: string;
  status: MessageRequestStatus;
  createdAt: string;
}

export interface PresignedUpload {
  uploadUrl: string;
  storageKey: string;
  publicUrl: string;
  expiresInSeconds: number;
}

export interface SharedPostPreview {
  id: number;
  subGroupId: number;
  title: string;
  contentSnippet: string | null;
  authorName: string;
  thumbnailUrl: string | null;
}

export interface BlockedUser {
  id: number;
  userId: number;
  userName: string;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
  pendingReports: number;
}

export interface AdminUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  bio: string | null;
  role: 'USER' | 'ADMIN';
  emailVerified: boolean;
  active: boolean;
  kvkkConsentAt: string | null;
  healthConsentAt: string | null;
  createdAt: string;
}

export type ReportStatus = 'PENDING' | 'REVIEWED' | 'REJECTED';
export type ReportTargetType = 'POST' | 'COMMENT' | 'MESSAGE' | 'USER';

export interface AdminReport {
  id: number;
  targetType: ReportTargetType;
  targetId: number;
  targetPreview: string | null;
  targetOwnerId: number | null;
  targetOwnerName: string | null;
  reporterId: number;
  reporterName: string;
  reason: string | null;
  status: ReportStatus;
  resolvedById: number | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface AdminPost {
  id: number;
  subGroupId: number;
  diseaseGroupId: number;
  authorId: number;
  authorName: string;
  title: string;
  content: string;
  attachments: { id: number; url: string; sortOrder: number }[];
  createdAt: string;
}

export interface AdminComment {
  id: number;
  postId: number;
  authorId: number;
  authorName: string;
  content: string;
  deleted: boolean;
  createdAt: string;
}
