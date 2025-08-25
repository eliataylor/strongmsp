"""
If own and others are both defined
    If different
        Check roles and ownership
    Else if same:
        Only check roles

If only own is defined:
    Check role and ownership.
        Others falls back False

If only others is defined:
    Check role and ownership
        Own falls back to False

If neither is defined
    Fallback on default permission

——

If verb has list or detail:
    Apply named permission at retrieve and list actions separately.
    Named permission just tests role and ownership.

"""

####OBJECT-ACTIONS-PERMISSIONS-IMPORTS-STARTS####
# no permission matrix provided
####OBJECT-ACTIONS-PERMISSIONS-IMPORTS-ENDS####

####OBJECT-ACTIONS-PERMISSIONS-STARTS####
# no permission matrix provided
####OBJECT-ACTIONS-PERMISSIONS-ENDS####