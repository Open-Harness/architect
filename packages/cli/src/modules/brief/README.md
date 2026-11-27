# brief

`ortho brief <thing>.<verb>`: the brief for writing one handler. It names the one file to write, the files to
read (the declaration, the generated handler type, the docs pages), what the handler must do (its steps, its move,
its refusals with exit codes, and which refusals the runtime gives instead: before the handler runs, or for a rule after
its move and before the commit), the files never to touch, and what must
pass: prove with the operation's nine evals and the journeys that call it, and check. Gate 1's `claude -p` session
is given only this.
