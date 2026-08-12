import generate from "../../lib/handlers/generate.js";
import { withErrors } from "../../lib/wrap.js";

export default withErrors(generate);
