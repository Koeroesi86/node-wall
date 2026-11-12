interface MaybeUserInfo {
  user: { role: string };
}

export default (userInfo?: MaybeUserInfo | null): boolean => userInfo?.user.role === 'admin';
