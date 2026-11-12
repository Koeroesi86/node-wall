interface MaybeUserInfo {
  user: { role: string };
}

export default <UserInfo extends MaybeUserInfo>(userInfo?: UserInfo | null): userInfo is UserInfo => userInfo?.user.role === 'admin';
