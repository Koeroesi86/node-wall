import { beforeEach, expect, test, vi } from 'vitest';
import addLogin from './queries/addLogin';
import addTag from './queries/addTag';
import create from './queries/create';
import getById from './queries/getById';
import getLogin from './queries/getLogin';
import getTags from './queries/getTags';
import removeTag from './queries/removeTag';
import setName from './queries/setName';
import getList from './queries/getList';
import setRole from './queries/setRole';
import userService from './index';

vi.mock('crypto', () => ({ randomUUID: () => 'new-id' }));
vi.mock('./queries/addLogin');
vi.mock('./queries/addTag');
vi.mock('./queries/create');
vi.mock('./queries/getById');
vi.mock('./queries/getLogin');
vi.mock('./queries/getTags');
vi.mock('./queries/removeTag');
vi.mock('./queries/setName');
vi.mock('./queries/getList');
vi.mock('./queries/setRole');

beforeEach(() => vi.resetAllMocks());

test('create stores a named user', async () => {
  expect(await userService.create('Ann')).toEqual({ id: 'new-id', name: 'Ann', role: 'user' });
  expect(create).toHaveBeenCalledWith('new-id', 'Ann', 'user');
});

test('create stores an anonymous user with a null name', async () => {
  await userService.create();
  expect(create).toHaveBeenCalledWith('new-id', null, 'user');
});

test('addLogin defaults to an email login', async () => {
  expect(await userService.addLogin('u1', 'a@b.c')).toEqual({ id: 'new-id', userId: 'u1', value: 'a@b.c', type: 'email' });
  expect(addLogin).toHaveBeenCalledWith('new-id', 'u1', 'a@b.c', 'email');
});

test('reads delegate to the queries', async () => {
  vi.mocked(getById).mockResolvedValue({ id: 'u1' });
  vi.mocked(getLogin).mockResolvedValue({ id: 'l1' });
  vi.mocked(getTags).mockResolvedValue([]);

  expect(await userService.get('u1')).toEqual({ id: 'u1' });
  expect(await userService.getLogin('email', 'a@b.c')).toEqual({ id: 'l1' });
  expect(await userService.getTags('u1')).toEqual([]);
  expect(getLogin).toHaveBeenCalledWith('email', 'a@b.c');
});

test('writes delegate to the queries', async () => {
  await userService.setName('u1', 'Ann');
  await userService.addTag('t1', 'u1', 'liked');
  await userService.removeTag('t1', 'u1');

  expect(setName).toHaveBeenCalledWith('u1', 'Ann');
  expect(addTag).toHaveBeenCalledWith('t1', 'u1', 'liked');
  expect(removeTag).toHaveBeenCalledWith('t1', 'u1');
});

test('getList returns all users', async () => {
  vi.mocked(getList).mockResolvedValue([{ id: 'u1' }]);
  expect(await userService.getList()).toEqual([{ id: 'u1' }]);
});

test('setRole updates the role', async () => {
  await userService.setRole('u1', 'admin');
  expect(setRole).toHaveBeenCalledWith('u1', 'admin');
});
