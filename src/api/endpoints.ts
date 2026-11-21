import { request } from './client';
import type {
  AdminComment,
  AdminPost,
  AdminReport,
  AdminStats,
  AdminUser,
  AppNotification,
  BlockedUser,
  ReportStatus,
  AuthTokens,
  ChatMessage,
  Conversation,
  MessageRequest,
  PresignedUpload,
  SearchResult,
  UserCard,
  Comment,
  DiseaseGroup,
  PageResponse,
  Post,
  PostSort,
  PostType,
  ReactionValue,
  RegisterInput,
  SubGroup,
  User,
} from './types';

type Page = { page?: number; size?: number; signal?: AbortSignal };

// --- Auth ---
export const registerUser = (input: RegisterInput) =>
  request<User>('/auth/register', {
    method: 'POST',
    auth: false,
    body: {
      ...input,
      nickname: input.nickname || null,
      city: input.city || null,
      communityRole: input.communityRole || null,
      discoverable: false,
      profilePublic: true,
    },
  });

export const loginUser = (email: string, password: string) =>
  request<AuthTokens>('/auth/login', { method: 'POST', auth: false, body: { email, password } });

export const refreshTokens = (refreshToken: string) =>
  request<AuthTokens>('/auth/refresh', { method: 'POST', auth: false, body: { refreshToken } });

export const verifyEmail = (email: string, code: string) =>
  request<{ message: string }>('/auth/verify-email', { method: 'POST', auth: false, body: { email, code } });

export const forgotPassword = (email: string) =>
  request<{ message: string }>('/auth/forgot-password', { method: 'POST', auth: false, body: { email } });

export const resetPassword = (email: string, code: string, newPassword: string) =>
  request<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    auth: false,
    body: { email, code, newPassword },
  });

export const changePassword = (currentPassword: string, newPassword: string) =>
  request<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });

export const logoutUser = () => request<unknown>('/auth/logout', { method: 'POST' });

// --- Kullanıcı ---
export const getMe = () => request<User>('/users/me');

// nickname: boş string => takma adı kaldır.
export const updateProfile = (body: {
  firstName: string;
  lastName: string;
  bio: string | null;
  city: string | null;
  nickname?: string;
}) => request<User>('/users/me', { method: 'PUT', body });

export const updateHealthProfile = (body: {
  communityRole: User['communityRole'];
  discoverable: boolean;
  profilePublic: boolean;
}) => request<User>('/users/me/health-profile', { method: 'PUT', body });

export const completeOnboarding = () => request<User>('/users/me/onboarding/complete', { method: 'POST' });

export const updateHealthConsent = (granted: boolean) =>
  request<User>('/users/me/health-consent', { method: 'PUT', body: { granted } });

export const updatePreferences = (weeklyDigestEnabled: boolean) =>
  request<User>('/users/me/preferences', { method: 'PUT', body: { weeklyDigestEnabled } });

export const exportMyData = () => request<unknown>('/users/me/data-export');

export const deleteAccount = (password: string) =>
  request<unknown>('/users/me/delete-account', { method: 'POST', body: { password } });

export const getMyDiseaseGroups = () => request<DiseaseGroup[]>('/users/me/disease-groups');

export const getMyPosts = ({ page = 0, size = 20, signal }: Page = {}) =>
  request<PageResponse<Post>>('/users/me/posts', { params: { page, size }, signal });

export const getMySavedPosts = ({ page = 0, size = 20, signal }: Page = {}) =>
  request<PageResponse<Post>>('/users/me/saved-posts', { params: { page, size }, signal });

// --- Gruplar ---
export const listDiseaseGroups = (q?: string, signal?: AbortSignal) =>
  request<DiseaseGroup[]>('/disease-groups', { params: { q }, signal });

export const getDiseaseGroup = (id: number) => request<DiseaseGroup>(`/disease-groups/${id}`);
export const joinDiseaseGroup = (id: number) => request<unknown>(`/disease-groups/${id}/join`, { method: 'POST' });
export const leaveDiseaseGroup = (id: number) => request<unknown>(`/disease-groups/${id}/leave`, { method: 'DELETE' });

export const listSubGroups = (diseaseGroupId: number) =>
  request<SubGroup[]>(`/disease-groups/${diseaseGroupId}/sub-groups`);
export const getSubGroup = (id: number) => request<SubGroup>(`/sub-groups/${id}`);

// --- Gönderiler ---
export const getFeed = ({ page = 0, size = 20, sort, signal }: Page & { sort?: PostSort } = {}) =>
  request<PageResponse<Post>>('/posts/feed', { params: { page, size, sort }, signal });

export const listPostsBySubGroup = (
  subGroupId: number,
  { page = 0, size = 20, sort, signal }: Page & { sort?: PostSort } = {},
) => request<PageResponse<Post>>(`/sub-groups/${subGroupId}/posts`, { params: { page, size, sort }, signal });

export const getPost = (id: number, signal?: AbortSignal) => request<Post>(`/posts/${id}`, { signal });

export const createPost = (
  subGroupId: number,
  body: { title: string; content: string; postType?: PostType; pollOptions?: string[]; attachmentKeys?: string[] },
) => request<Post>(`/sub-groups/${subGroupId}/posts`, { method: 'POST', body });

export const deletePost = (id: number) => request<unknown>(`/posts/${id}`, { method: 'DELETE' });

export const searchPosts = (q: string, { page = 0, size = 20, signal }: Page = {}) =>
  request<PageResponse<Post>>('/posts/search', { params: { q, page, size }, signal });

export const votePoll = (postId: number, optionId: number) =>
  request<unknown>(`/posts/${postId}/poll/vote`, { method: 'PUT', body: { optionId } });
export const removePollVote = (postId: number) => request<unknown>(`/posts/${postId}/poll/vote`, { method: 'DELETE' });

// --- Tepki / kaydet / şikayet ---
export const reactToPost = (postId: number, value: ReactionValue) =>
  request<unknown>(`/posts/${postId}/reactions`, { method: 'PUT', body: { value } });
export const removePostReaction = (postId: number) =>
  request<unknown>(`/posts/${postId}/reactions`, { method: 'DELETE' });

export const reactToComment = (commentId: number, value: ReactionValue) =>
  request<unknown>(`/comments/${commentId}/reactions`, { method: 'PUT', body: { value } });
export const removeCommentReaction = (commentId: number) =>
  request<unknown>(`/comments/${commentId}/reactions`, { method: 'DELETE' });

export const savePost = (postId: number) => request<unknown>(`/posts/${postId}/saved`, { method: 'PUT' });
export const unsavePost = (postId: number) => request<unknown>(`/posts/${postId}/saved`, { method: 'DELETE' });

export const reportPost = (postId: number, reason?: string) =>
  request<unknown>(`/posts/${postId}/report`, { method: 'POST', body: { reason: reason || null } });
export const reportComment = (commentId: number, reason?: string) =>
  request<unknown>(`/comments/${commentId}/report`, { method: 'POST', body: { reason: reason || null } });

// --- Yorumlar ---
export const listComments = (postId: number, { page = 0, size = 20, signal }: Page = {}) =>
  request<PageResponse<Comment>>(`/posts/${postId}/comments`, { params: { page, size }, signal });

export const listCommentReplies = (commentId: number, { page = 0, size = 20, signal }: Page = {}) =>
  request<PageResponse<Comment>>(`/comments/${commentId}/replies`, { params: { page, size }, signal });

export const createComment = (postId: number, content: string, parentCommentId?: number | null) =>
  request<Comment>(`/posts/${postId}/comments`, {
    method: 'POST',
    body: { content, parentCommentId: parentCommentId ?? null },
  });

export const deleteComment = (id: number) => request<unknown>(`/comments/${id}`, { method: 'DELETE' });

export const acceptAnswer = (postId: number, commentId: number) =>
  request<unknown>(`/posts/${postId}/accepted-answer`, { method: 'PUT', body: { commentId } });
export const unacceptAnswer = (postId: number) =>
  request<unknown>(`/posts/${postId}/accepted-answer`, { method: 'DELETE' });

// --- Arama ---
export const quickSearch = (q: string, signal?: AbortSignal) =>
  request<SearchResult>('/search', { params: { q }, signal });

export const searchUsers = (q: string, { page = 0, size = 20, signal }: Page = {}) =>
  request<PageResponse<UserCard>>('/users/search', { params: { q, page, size }, signal });

export const getUserPublicProfile = (id: number) => request<UserCard>(`/users/${id}`);

export const getUserPosts = (id: number, { page = 0, size = 20, signal }: Page = {}) =>
  request<PageResponse<Post>>(`/users/${id}/posts`, { params: { page, size }, signal });

export const reportUser = (userId: number, reason?: string) =>
  request<unknown>(`/users/${userId}/report`, { method: 'POST', body: { reason: reason || null } });

// --- Bildirimler ---
export const listNotifications = ({ page = 0, size = 20, signal }: Page = {}) =>
  request<PageResponse<AppNotification>>('/notifications', { params: { page, size }, signal });
export const getUnreadNotificationCount = (signal?: AbortSignal) =>
  request<{ count: number }>('/notifications/unread-count', { signal });
export const markNotificationRead = (id: number) =>
  request<unknown>(`/notifications/${id}/read`, { method: 'PUT' });
export const markAllNotificationsRead = () => request<unknown>('/notifications/read-all', { method: 'PUT' });

// --- Mesajlaşma ---
export const sendMessageRequest = (recipientId: number) =>
  request<{ autoAccepted?: boolean; conversationId?: number }>('/messages/requests', {
    method: 'POST',
    body: { recipientId },
  });
export const listMessageRequests = ({ page = 0, size = 20, signal }: Page = {}) =>
  request<PageResponse<MessageRequest>>('/messages/requests', { params: { page, size }, signal });
export const getPendingMessageRequestCount = (signal?: AbortSignal) =>
  request<{ count: number }>('/messages/requests/count', { signal });
export const acceptMessageRequest = (id: number) =>
  request<unknown>(`/messages/requests/${id}/accept`, { method: 'PUT' });
export const rejectMessageRequest = (id: number) =>
  request<unknown>(`/messages/requests/${id}/reject`, { method: 'PUT' });

export const listConversations = ({ page = 0, size = 20, signal }: Page = {}) =>
  request<PageResponse<Conversation>>('/messages/conversations', { params: { page, size }, signal });
export const getConversation = (id: number) => request<Conversation>(`/messages/conversations/${id}`);
export const getUnreadMessageCount = (signal?: AbortSignal) =>
  request<{ count: number }>('/messages/unread-count', { signal });
export const listConversationMessages = (id: number, { page = 0, size = 30, signal }: Page = {}) =>
  request<PageResponse<ChatMessage>>(`/messages/conversations/${id}/messages`, { params: { page, size }, signal });
export const sendChatMessage = (id: number, body: { content?: string; attachmentKey?: string; sharedPostId?: number }) =>
  request<ChatMessage>(`/messages/conversations/${id}/messages`, { method: 'POST', body });
export const markConversationRead = (id: number) =>
  request<unknown>(`/messages/conversations/${id}/read`, { method: 'PUT' });
export const blockUser = (userId: number) => request<unknown>(`/messages/block/${userId}`, { method: 'POST' });
export const unblockUser = (userId: number) => request<unknown>(`/messages/block/${userId}`, { method: 'DELETE' });
export const reportMessage = (messageId: number, reason?: string) =>
  request<unknown>(`/messages/${messageId}/report`, { method: 'POST', body: { reason: reason || null } });

// --- Medya ---
export const requestPresignedUpload = (contentType: string) =>
  request<PresignedUpload>('/media/presigned-upload-url', { method: 'POST', body: { contentType } });

export const listBlockedUsers = () => request<BlockedUser[]>('/messages/blocked');

// --- Admin ---
export const getAdminStats = () => request<AdminStats>('/admin/stats');

export const listAdminUsers = ({ q, active, page = 0, size = 20, signal }: Page & { q?: string; active?: boolean }) =>
  request<PageResponse<AdminUser>>('/admin/users', { params: { q, active, page, size }, signal });

export const updateAdminUser = (
  id: number,
  body: { firstName: string; lastName: string; bio: string | null; role: 'USER' | 'ADMIN'; active: boolean },
) => request<AdminUser>(`/admin/users/${id}`, { method: 'PUT', body });

export const listAdminReports = ({ status, page = 0, size = 20, signal }: Page & { status?: ReportStatus }) =>
  request<PageResponse<AdminReport>>('/admin/reports', { params: { status, page, size }, signal });

export const resolveAdminReport = (id: number, status: ReportStatus, deleteContent: boolean) =>
  request<{ message: string }>(`/admin/reports/${id}`, { method: 'PUT', body: { status, deleteContent } });

export const listAdminPosts = ({ q, page = 0, size = 20, signal }: Page & { q?: string }) =>
  request<PageResponse<AdminPost>>('/admin/posts', { params: { q, page, size }, signal });

export const listAdminComments = ({ q, page = 0, size = 20, signal }: Page & { q?: string }) =>
  request<PageResponse<AdminComment>>('/admin/comments', { params: { q, page, size }, signal });

export const createDiseaseGroup = (name: string, description: string | null) =>
  request<DiseaseGroup>('/disease-groups', { method: 'POST', body: { name, description } });
export const deleteDiseaseGroup = (id: number) => request<unknown>(`/disease-groups/${id}`, { method: 'DELETE' });
export const createSubGroup = (diseaseGroupId: number, name: string, description: string | null) =>
  request<SubGroup>(`/disease-groups/${diseaseGroupId}/sub-groups`, { method: 'POST', body: { name, description } });
export const deleteSubGroup = (id: number) => request<unknown>(`/sub-groups/${id}`, { method: 'DELETE' });
