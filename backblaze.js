(() => {
  const notificationArea = document.getElementById('notificationArea')
  const progressArea = document.getElementById('progressArea')
  const downloadButton = document.getElementById('downloadButton')
  downloadButton.onclick = startDownload

  function startDownload () {
    const urlInput = document.getElementById('filepath').value
    const threadsInput = document.getElementById('threads')
    const chunkSizeInput = document.getElementById('chunkSize')
    const retriesInput = document.getElementById('retries')

    if (urlInput) {
      const fileUrl = urlInput
      const threads = parseInt(threadsInput.value)
      const chunkSize = parseInt(chunkSizeInput.value) * 1024 * 1024
      const retries = parseInt(retriesInput.value)
      const fileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);

      downloadFile({fileUrl, threads, chunkSize, retries, fileName})
    }
  }

  function removeAllChildren (element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild)
    }
  }

  function downloadFile (options) {
    // Remove any children in the DOM from previous downloads
    removeAllChildren(notificationArea)
    removeAllChildren(progressArea)

    // Change "Download" button text & function to "Cancel"
    downloadButton.innerText = 'Cancel'
    downloadButton.onclick = () => {
      multiThread.cancel()
      // Switch back to download again
      downloadButton.innerText = 'Download'
      downloadButton.onclick = startDownload
    }

    let totalChunks = 0
    let progressElements = []
    const notification = document.createElement('blockquote')

    // These are the main "thread" handlers
    options.onStart = ({contentLength, chunks}) => {
      console.log(chunks)
      notificationArea.appendChild(notification)
      totalChunks = chunks
    }

    options.onFinish = () => {
      notification.innerText += '\nFinished successfully!'
      downloadButton.innerText = 'Download'
      downloadButton.onclick = startDownload
    }

    options.onError = ({error}) => {
      console.error(error)
    }

    options.onProgress = ({contentLength, loaded}) => {
      console.log(contentLength)
      const bytesToMb = bytes => {
        return bytes / 1024 / 1024
      }

      // handle divide-by-zero edge case when Content-Length=0
      const percent = contentLength ? Math.round(loaded / contentLength * 100) : 1

      loaded = bytesToMb(loaded).toFixed(1)
      contentLength = bytesToMb(contentLength).toFixed(1)
      notification.innerText = `Downloading ${totalChunks} chunks
                                ${loaded}/${contentLength} MB, ${percent}%`
    }

    // These are the individual chunk handlers
    options.onChunkStart = ({id}) => {
      if (!progressElements[id]) {
        const bg = document.createElement('div')
        bg.classList.add('progress-background')

        const fill = document.createElement('span')
        fill.classList.add('progress-fill')
        fill.style.width = '0%'

        bg.appendChild(fill)
        progressArea.prepend(bg)
        progressElements[id] = {bg, fill}
        progressElements[id].fill.classList.add('downloading')
      } else {
        progressElements[id].fill.classList.remove('downloading')
        progressElements[id].fill.classList.remove('error')
        progressElements[id].fill.classList.add('warning')
      }
    }

    options.onChunkFinish = ({id}) => {
      progressElements[id].fill.classList.remove('error')
      progressElements[id].fill.classList.remove('warning')
      progressElements[id].fill.classList.remove('downloading')
      progressElements[id].fill.classList.add('finished')
    }

    options.onChunkError = ({id, error}) => {
      progressElements[id].fill.classList.remove('downloading')
      progressElements[id].fill.classList.remove('warning')
      progressElements[id].fill.classList.add('error')
      console.warn(`Chunk ${id}:`, error)
    }

    options.onChunkProgress = ({contentLength, loaded, id}) => {
      if (!progressElements[id]) {
        options.onChunkStart({id})
      } else {
        if (progressElements[id].fill.classList.contains('warning')) {
          progressElements[id].fill.classList.remove('warning')
          progressElements[id].fill.classList.add('downloading')
        }

        // handle divide-by-zero edge case when Content-Length=0
        const percent = contentLength ? loaded / contentLength : 1
        progressElements[id].fill.style.width = `${percent * 100}%`
      }
    }

    options.url = `${options.fileUrl}`

    const multiThread = new MultiThread(options)
  }
})()
