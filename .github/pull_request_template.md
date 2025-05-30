# Description
<!--
  This is a template to add as much information as possible to the pull request, to help the reviewer and as a checklist for you. Points to remember are set in the comments, please read and keep them in mind:

    - Code should be self-explanatory and share your knowledge with others
    - Document code that is not self-explanatory
    - Think about bugs and keep security in mind
    - Write tests (Unit and Integration), also for error cases
    - Main logic should hidden behind the api, never trust the client
    - Visible changes should be discussed with the UX-Team from the begining of development; they also have to accept them at the end
    - Keep the changelog up-to-date
    - Leave the code cleaner than you found it. Remove unnecessary lines. Listen to the linter.
-->

## Links to Tickets or other pull requests
<!--
Base links to copy
- https://github.com/dBildungsplattform/erwin-portal-server/pulls
- https://ticketsystem.dbildungscloud.de/browse/SPSH-???
- https://ticketsystem.dbildungscloud.de/browse/EW-???
-->

## Changes
<!--
  What will the PR change?
  Why are the changes required?
  Short notice if a ticket exists, more detailed if not
-->

## Datasecurity
<!--
  Notice about:
  - model changes
  - logging of user data
  - permission changes
  - and other sensitive user related data
  If you are not sure if it is relevant, take a look at confluence or ask the data-security team.
-->

## Deployment
<!--
  - Keep in mind to change seed data, if changes are done on migration scripts.
  - Mention what is required for deployment after changes on infrastructure and inform SRE about it
  - Explain changes on the config schema, which need to be addressed regarding the impact on helm charts 
  - Mention Migration scripts to run, or other requirements
-->

## New Repos, NPM pakages or vendor scripts
<!--
  Keep in mind the stability, performance, activity and author.
  Check licenses and have it cleared.

  Describe why it is needed.
-->

## Approval for review
- [ ] QA: In addition to review, the code has been manually tested (if manual testing is possible)
- [ ] All points were discussed with the ticket creator, support-team or product owner. The code upholds all quality guidelines from the PR-template.