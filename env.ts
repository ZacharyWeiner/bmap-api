import chalk from 'chalk'
import prompt from 'prompt-async'

const ensureEnvVars = () => {
  return new Promise<void>(async (resolve, reject) => {
    if (!process.env.MONGO_URL) {
      prompt.start()
      try {
        chalk.red(
          'Enter MongoDB connection URL: (mongodb://127.0.0.1:27017/bmap)'
        )

        const { MONGO_URL } = await prompt.get(['MONGO_URL'])

        process.env.MONGO_URL = MONGO_URL.length
          ? MONGO_URL
          : `mongodb://127.0.0.1:27017/bmap`
      } catch (e) {
        reject('failed to get mongo url')
        return
      }
    }

    resolve()
  })
}

export { ensureEnvVars }
