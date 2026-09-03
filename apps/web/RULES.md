## Architecture

**1. Always absolute paths and @**

- @ in webpack config

**2. Group components by route**

- Plain containers and components are bad design
- Modules are better. Eg 1 common module and one module for each logical part, eg pages etc.
- Each logical module should have all its components in itself

**3. Manage dependencies between modules**

- In theory the goal is to only import pieces from your own or the common module
- Sometimes code copies are okay because they diverge and we dont want them too configurable -> wrong abstraction could
  lead to too complex components
- "Rule of three", when you copy it for a third time think about making an abstraction

**4. Wrap external components**

- Third party imports may change, we dont want to depend on that so we should wrap them. This also leads to change in
  only one place and not potentially many

**5. Designing module**

- Have some limitations for growing modules, eg keeping the same general folder structure for simplicity. But don't
  enforce them limitless by eg creating a hooks folder for a module that has no hooks.
- A module may have components, utils, hooks, api and an index.js but each module needs to adapt the rules to itself

**6. Keep things close to where they are used**

- Don't put utils, configs or others, that are not global in the global space
- If components get to big turn it into a folder, then follow "manage duplication between modules" and move it up

**7. Separate UI from Business Logic**

- Business logic is better dealt with in a custom hook the UI component imports, than to have it inline, depending on
  the complexity of the logic
- In general components should be clean from domain specific business logic

**8. Modules should own their own routes (except SPA's)**

- Only keep the main route and files for each module on the global level. Nested routes and detailed structure of the
  page should be owned by the corresponding modules themselves

**9. Avoid single global contexts**

- Also separate contexts logically, eg user settings, theme etc.
- Dont put all contexts at the root but only at the highest place where they are needed

**10. The Styling Dilemma**

- Css-in-js scales better than plain css, but it can lead to lengthy components
- Because of this and for long tailwind strings specifically, turn those into reusable well named components which are
  easier to understand than long utility strings

**11. Avoid hardcoded links**

- Main Urls as env vars and paths in utility objects that represent the link structure even with parameters. This keeps
  links clean and centralizes them
- Validating the input should be done before the utility object is used

**12. Create Layout Components**

- Layout components, should provide the skeleton and style of a page to create consistency, setup seo tags and render
  children in the right places
- Layout components should have less logic, eg now type for different layout types, just create another layout
  component. Duplication with layout components is not bad as they are changed less often

**13. Working with Nextjs**

- Next's router is file based, as is its layouting feature. This could inhibit co-location
- So we adapt hexagonal architecture using next's file-based router as an adapter over our logic
- So the we keep src/app/{x} for the router but only import the actual high level content from src/modules/{x}. So we
  could have src/app/dashboard/page.tsx while the content comes from src/module/dashboard/DashboardPage.tsx.
- Next's page only serves as a light layer on top like this. Serverside props logic however can also be kept in the page