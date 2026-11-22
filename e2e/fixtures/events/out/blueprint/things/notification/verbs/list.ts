import { Blueprint } from "orthograph";
import { Notification } from "../thing.ts";

export default Blueprint.read(Notification, { where: ["state"], order: "oldest", page: 50, allowed: [Blueprint.anyone] });
