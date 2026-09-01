# Security

These probes read the page you point them at and, in the case of
`probe-routes.js`, issue GET requests to same-origin links as the signed-in
user. They never write, submit or mutate, and `probe-routes.js` skips any
href matching a destructive pattern.

If you find a way to make a probe write, exfiltrate or escalate, please report
it privately through GitHub Security Advisories on this repository rather than
opening a public issue.

## Running probes on sites you do not own

The probes execute in your own browser against a page you have loaded. That is
no different from using DevTools. Publishing what you find about someone
else’s product is a separate decision, and one worth making deliberately.
