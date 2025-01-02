export const apiHelpers = {
  async openai(content, systemMessage, apiKey, params) {
    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [systemMessage, { role: 'user', content }],
        ...params,
        stream: true
      })
    }).then(res => res.body)
  },

  async gemini(content, systemMessage, apiKey, params) {
    return fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:streamGenerateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        contents: [
          { role: 'system', content: systemMessage.content },
          { role: 'user', content }
        ],
        generationConfig: params
      })
    }).then(res => res.body)
  },

  async anthropic(content, systemMessage, apiKey, params) {
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        messages: [
          { role: 'system', content: systemMessage.content },
          { role: 'user', content }
        ],
        ...params,
        stream: true
      })
    }).then(res => res.body)
  }
}