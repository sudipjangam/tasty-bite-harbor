
# Persistent Workspace Constraints

You are operating within the `tasty-bite-harbor` repository. To avoid context drift, re-memorizing layout rules, or hallucinating paths, you must adhere to the following rules:

1. **Memory Caching:** Treat the resource files (`codebase_catalog`, `component_details`, `file_reference_map`) as active, immutable truths in your short-term memory.
2. **Pre-Flight Check:** Before suggesting any changes to frontend files (such as `CrossBranchInventory.tsx`), verify component patterns against `COMPONENTS_DETAILS.md`.
3. **Execution Efficiency:** Do not spend prompt tokens rethinking the project structure or asking the user to re-upload reference files. Use the cached versions immediately.
