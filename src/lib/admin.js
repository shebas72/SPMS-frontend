import { can } from '@/lib/roles'

// Kept for older imports: whoever manages the team. Prefer can(user, 'permission') from '@/lib/roles'.
export const isAdmin = (user) => can(user, 'team.manage')
