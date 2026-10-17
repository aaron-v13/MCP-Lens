# Deploying MCP Lens Server to AWS Lambda

This server is designed to run serverless on AWS Lambda using **Lambda Function URLs with `RESPONSE_STREAM` invoke mode**. This provides unbuffered Server-Sent Events (SSE) streaming directly to the browser client without API Gateway buffering.

---

### Prerequisites
1. AWS CLI installed and configured (`aws sts get-caller-identity`).
2. AWS SAM CLI installed (`sam --version`) or standard zip upload.
3. Node.js 20+ runtime.

---

### Deployment with AWS SAM

1. **Build the server:**
   ```bash
   cd server
   npm run build
   ```

2. **Deploy the stack:**
   ```bash
   cd ../deploy
   sam build
   sam deploy --guided
   ```

   During guided deployment:
   - Stack Name: `mcp-lens-server`
   - AWS Region: e.g. `us-east-1`
   - Parameter `MCP_LENS_TOKEN`: your chosen bearer token (e.g. `openssl rand -hex 24`)
   - Confirm changes: `y`

3. **Retrieve your Function URL:**
   SAM outputs `McpFunctionUrl`. It looks like:
   `https://<unique-id>.lambda-url.<region>.on.aws/`

4. **Connect the Web App:**
   In `web/.env`:
   ```env
   VITE_DEFAULT_SERVER_URL=https://<unique-id>.lambda-url.<region>.on.aws/mcp
   VITE_DEFAULT_TOKEN=<your-chosen-token>
   ```
   Start the web app with `npm run dev` and click **Connect**.
