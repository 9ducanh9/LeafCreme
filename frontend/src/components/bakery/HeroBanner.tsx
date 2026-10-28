import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import Button from '../ui/Button'
import { useLeafieContext } from '../../contexts/LeafieContext'

export default function HeroBanner() {
  const { openChat } = useLeafieContext()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      setReducedMotion(preference.matches)
      if (preference.matches) videoRef.current?.pause()
    }
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])

  const togglePlayback = async () => {
    const video = videoRef.current
    if (!video) return
    if (!video.paused) video.pause()
    else {
      try { await video.play() } catch { /* Keep the play button available if playback is blocked. */ }
    }
  }

  return (
    <>
      <section className="halloween-hero" aria-label="Câu chuyện Leaf Creme">
        <div className="halloween-hero-media">
        <img
          src="/seasonal/halloween-dark-hero.jpg"
          alt="Bánh kem dâu rừng phủ chocolate đen và quả mọng tươi bên ánh nến"
          width="1920"
          height="1080"
          loading="eager"
          className="halloween-hero-image"
        />
        {!failed && <video
          ref={videoRef}
          className="halloween-hero-video"
          src="/seasonal/halloween-cake-commercial.mp4"
          poster="/seasonal/halloween-dark-hero.jpg"
          autoPlay={!reducedMotion}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setFailed(true)}
        />}
        {!failed && <div className="halloween-video-controls" aria-label="Điều khiển video banner">
          <button type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'} aria-pressed={!muted}>
            {muted ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
            <span>{muted ? 'Bật âm thanh' : 'Tắt âm thanh'}</span>
          </button>
          <button type="button" onClick={() => void togglePlayback()} aria-label={playing ? 'Tạm dừng video' : 'Phát video'}>
            {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
          </button>
        </div>}
        <span className="halloween-image-caption">Bánh mẫu mùa Halloween từ căn bếp Leaf Creme</span>
        </div>
        <div className="halloween-hero-content">
          <div className="halloween-hero-copy">
            <p className="halloween-eyebrow">
              <span className="halloween-eyebrow-line" aria-hidden="true" />
              <span>Góc bếp tháng Mười · Mùa Halloween</span>
            </p>
            <h1>Leaf Creme</h1>
            <h2>
              <span className="halloween-desktop-copy">Mùa trăng cuối thu, mình nướng thêm vài mẻ bánh tối màu.</span>
              <span className="halloween-mobile-copy">Đêm nay, vị ngọt thức giấc.</span>
            </h2>
            <p className="halloween-hero-description">
              <span className="halloween-desktop-copy">Vẫn là cốt bánh mềm và lớp kem tươi quen thuộc mỗi ngày, mình chỉ thêm chút chocolate đắng nhẹ, mứt dâu rừng nấu chậm và quả mọng tươi cho những cuộc hẹn cuối tháng Mười.</span>
              <span className="halloween-mobile-copy">Chocolate đậm vị, dâu rừng chua dịu. Một chút ngọt ngào cho đêm Halloween.</span>
            </p>
            <div className="halloween-hero-actions">
              <Button href="/search" variant="primary" size="lg">
                <span>Xem menu bánh hôm nay</span>
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Button>
              <button type="button" onClick={openChat} className="halloween-hero-glass-btn">
                <span>Nhờ Leafie chọn bánh</span>
              </button>
            </div>
          </div>
        </div>

      </section>

      <div className="halloween-season-ribbon py-3">
        <div className="mx-auto flex max-w-container flex-wrap items-center justify-center gap-x-6 gap-y-1.5 px-4 text-xs text-fg-muted sm:px-6 lg:px-8">
          <span>Bánh làm thủ công từng mẻ nhỏ</span>
          <span className="text-brand-fg/60" aria-hidden="true">·</span>
          <span>Menu mùa Halloween phục vụ đến hết 31/10</span>
          <span className="hidden text-brand-fg/60 sm:inline" aria-hidden="true">·</span>
          <span className="hidden sm:inline">Đặt trước 2 giờ để bếp kịp chuẩn bị bánh mới</span>
        </div>
      </div>
    </>
  )
}
