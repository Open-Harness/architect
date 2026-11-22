# events

`AbiEvents.source<Name, Args>(item, address, fromBlock)`: a typed `EventSource` for one ABI event item, `makeEventSource` underneath,
`Args` the generated argument type (`types.ts`, section 4 of `ST2-abi-adapters.md`). The follower (M6.09) takes it, and `on:` (M5.03)
brings the events into operations; this slice only makes them typed and decodable. A log of another address or another event is a
`ChainFault` of kind `event`.
