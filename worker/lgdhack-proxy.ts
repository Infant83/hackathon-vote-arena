type Env = {
  HACK_WORKER: Fetcher
}

export default {
  fetch(request: Request, env: Env) {
    return env.HACK_WORKER.fetch(request)
  },
} satisfies ExportedHandler<Env>
