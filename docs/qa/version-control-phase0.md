# Version Control Phase 0 QA Checklist

## Pre-Deployment

- [ ] Unit tests pass for all new TypeScript helpers
- [ ] SQL migration runs successfully in staging environment
- [ ] Database indices are properly created
- [ ] Storage bucket policy updates applied

## Post-Deployment

- [ ] Feature flag `version_control_enabled` exists and is set to `false`
- [ ] All existing prototypes have a corresponding `v1` entry in `prototype_versions`
- [ ] `getLatestReadyVersion` returns legacy URLs when feature flag is off
- [ ] Storage paths are correctly generated with `getVersionPath`
- [ ] Bucket listing is properly restricted to authenticated users
- [ ] No new errors appear in application logs
- [ ] All existing prototype previews load correctly
- [ ] Prototype creation still works with legacy behavior

## Rollback Verification

- [ ] Rollback script successfully removes the new table and function
- [ ] Application continues to function after rollback
