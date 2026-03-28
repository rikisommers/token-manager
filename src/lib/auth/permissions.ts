export type Role = 'Admin' | 'Editor' | 'Viewer';

export const Action = {
  Read:             'Read',
  Write:            'Write',
  CreateCollection: 'CreateCollection',
  DeleteCollection: 'DeleteCollection',
  ManageUsers:      'ManageUsers',
  PushGithub:       'PushGithub',
  PushFigma:        'PushFigma',
} as const;

export type ActionType = typeof Action[keyof typeof Action];

const PERMISSIONS: Record<Role, Set<ActionType>> = {
  Admin:  new Set(Object.values(Action)),
  Editor: new Set([Action.Read, Action.Write, Action.CreateCollection, Action.PushGithub, Action.PushFigma]),
  Viewer: new Set([Action.Read]),
};

export function canPerform(role: Role, action: ActionType): boolean {
  return PERMISSIONS[role]?.has(action) ?? false;
}
