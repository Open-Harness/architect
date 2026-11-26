// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// The `--from-abi` checks' fixture (#1164): one of each thing an ABI holds that the generator maps. Probe.json is what the
// checks read: forge 1.9.0's artifact of this file, `forge build --use 0.8.30 --optimize --optimizer-runs 200`, cut to its
// `abi` and `bytecode.object` (solc 0.8.30+commit.73712a01). This file is its source, for the record.
contract Probe {
    struct Box {
        uint256 width;
        address holder;
        Inner inner;
    }
    struct Inner {
        bool sealed_;
        bytes32 tag;
    }
    struct Item {
        uint256 id;
        address who;
    }

    error TooBig(uint256 x, uint256 limit);
    error Empty();
    error Spent(bytes32);
    error Bad(uint256 code);
    error Rejected(Item item);

    event Poked(address indexed who, uint256 x, string note);
    event Funded(address indexed from, uint256 amount);
    event Sent(address indexed to, uint256 value);
    event Marked(bytes32);
    event Counted(uint256 indexed n, bool indexed flag, bytes32 indexed tag, string label);
    event Tick();

    uint256 public constant LIMIT = 100;
    uint256 private stored;
    uint256 public funded;
    address public owner;
    // A public mapping: its getter's input has no name, as Safe's `approvedHashes` and Roles' `allowances` have none.
    mapping(bytes32 => uint256) public marks;

    constructor(uint256 start) {
        stored = start;
        owner = msg.sender;
    }

    function peek() external view returns (uint256) {
        return stored;
    }

    function pair(uint256 a, int8 b) external pure returns (uint256 sum, bool odd) {
        return (a + uint256(int256(b < 0 ? -b : b)), a % 2 == 1);
    }

    function boxed(Box calldata b, uint256[] calldata extra) external pure returns (Box memory out, uint256 total) {
        uint256 t = b.width;
        for (uint256 i = 0; i < extra.length; i++) t += extra[i];
        return (b, t);
    }

    function label(bytes calldata data, string calldata name) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(data, name));
    }

    function poke(uint256 x) external returns (bool) {
        if (x > LIMIT) revert TooBig(x, LIMIT);
        stored = x;
        emit Poked(msg.sender, x, "poked");
        return true;
    }

    function drain() external {
        if (stored == 0) revert Empty();
        stored = 0;
    }

    function mark(bytes32 h) external {
        if (marks[h] != 0) revert Spent(h);
        marks[h] = block.number;
        emit Marked(h);
    }

    function count(uint256 n, string calldata label) external {
        emit Counted(n, n % 2 == 1, bytes32(n), label);
    }

    function tick() external {
        emit Tick();
    }

    function bad(uint256 code) external pure {
        revert Bad(code);
    }

    function reject(Item calldata item) external pure returns (bool) {
        if (item.id != 0) revert Rejected(item);
        return true;
    }

    function whoami() external view returns (address) {
        return msg.sender;
    }

    function total() external view returns (uint256 sum) {
        return stored + funded;
    }

    function first() external view returns (Item memory) {
        return Item(stored, owner);
    }

    function list(Item[] calldata extra) external view returns (Item[] memory) {
        Item[] memory out = new Item[](extra.length + 1);
        out[0] = Item(stored, owner);
        for (uint256 i = 0; i < extra.length; i++) out[i + 1] = extra[i];
        return out;
    }

    function refuseWrite() external {
        stored = stored;
        require(false, "nope");
    }

    function refuse() external pure {
        require(false, "nope");
    }

    function fund() external payable {
        funded += msg.value;
        emit Funded(msg.sender, msg.value);
    }

    function send(address to) external {
        emit Sent(to, 0);
    }

    function send(address to, uint256 value) external {
        emit Sent(to, value);
    }
}
