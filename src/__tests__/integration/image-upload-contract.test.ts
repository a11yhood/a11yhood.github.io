import { expect, it, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as http from 'node:http'
import * as https from 'node:https'
import { describeWithBackend } from '../helpers/with-backend'
import { DEV_USERS, getDevToken } from '@/lib/dev-users'

const TEST_IMAGE_PATH = resolve(process.cwd(), 'src/assets/images/ahood-small.png')

type UploadResponse = {
  image_id?: string
}

async function uploadImageViaNodeHttp(baseUrl: string, token: string): Promise<{ status: number; body: string }> {
  const imageBytes = readFileSync(TEST_IMAGE_PATH)
  const boundary = `----a11yhoodContract${Date.now().toString(16)}`

  const head = Buffer.from(
    `--${boundary}\r\n` +
      'Content-Disposition: form-data; name="file"; filename="contract-test.png"\r\n' +
      'Content-Type: image/png\r\n\r\n'
  )
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`)
  const body = Buffer.concat([head, imageBytes, tail])

  const endpoint = new URL('/api/images/upload', baseUrl)
  const requestLib = endpoint.protocol === 'https:' ? https : http

  return await new Promise((resolvePromise, rejectPromise) => {
    const req = requestLib.request(
      {
        protocol: endpoint.protocol,
        hostname: endpoint.hostname,
        port: endpoint.port,
        path: `${endpoint.pathname}${endpoint.search}`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
        ...(endpoint.hostname === 'localhost' && endpoint.protocol === 'https:'
          ? { rejectUnauthorized: false }
          : {}),
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk) => {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
        })
        res.on('end', () => {
          resolvePromise({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
          })
        })
      }
    )

    req.on('error', rejectPromise)
    req.write(body)
    req.end()
  })
}

describeWithBackend('Image Upload Contract', () => {
  it.skipIf(process.env.CI || process.env.GITHUB_ACTIONS)(
    'uploads multipart image and returns image_id',
    async () => {
      const backendBase = (globalThis as any).__TEST_BACKEND_BASE__ as string | undefined
      expect(backendBase).toBeTruthy()

      const token = getDevToken(DEV_USERS.moderator.role)
      const response = await uploadImageViaNodeHttp(backendBase!, token)

      expect(response.status).toBe(200)

      const payload = JSON.parse(response.body) as UploadResponse
      expect(typeof payload.image_id).toBe('string')
      expect(payload.image_id && payload.image_id.length > 0).toBe(true)
    },
    30000
  )
})
