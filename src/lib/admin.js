// Company admins manage the team and settings. The API enforces this too (hasRole('admin')).
export const isAdmin = (user) => (user?.roles ?? []).map((r) => (typeof r === 'string' ? r : r.name)).includes('admin')
