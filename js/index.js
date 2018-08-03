let musicRender = (function () {
    let $headerBox = $('.headerBox'),
        $contentBox = $('.contentBox'),
        $footerBox = $('.footerBox'),
        $wrapper = $contentBox.find('.wrapper'),
        $lyricList = null,
        musicAudio = $('#musicAudio')[0],
        $playBtn = $headerBox.find('.playBtn'),
        $duration = $footerBox.find('.duration'),
        $already = $footerBox.find('.already'),
        $current = $footerBox.find('.current');

    let computedContentH = function () {
        let winH = document.documentElement.clientHeight,
            fontSz = parseFloat(document.documentElement.style.fontSize);

        $contentBox.css({
            height: winH - $headerBox[0].offsetHeight - $footerBox[0].offsetHeight - .8 * fontSz
        });
    };

    let queryLyric = function () {
        return new Promise(resolve => {
            $.ajax({
                url: 'json/lyric.json',
                dataType: 'json',
                success: resolve
            })
        })
    };

    let bindHTML = function (lyricAry) {
        let str = ``;
        lyricAry.forEach(item => {
            let {minutes, seconds, content} = item;
            str += `<p data-minutes="${minutes}" data-seconds="${seconds}">${content}</p>`;
            $wrapper.html(str);
            $lyricList = $wrapper.find('p');
        });

    };

    //=>控制暂停播放
    let $plan = $.Callbacks();
    let playRun = function () {
        musicAudio.play();
        musicAudio.addEventListener('canplay', $plan.fire);
    };

    $plan.add(() => {
        $playBtn.css('display', 'block').addClass('move');
        $playBtn.tap(() => {
            if (musicAudio.paused) {
                //=>是否为暂停状态:是暂停我们让其播放
                musicAudio.play();
                $playBtn.addClass('move');
                return;
            }
            //=>当前是播放状态我们让其暂停
            musicAudio.pause();
            $playBtn.removeClass('move');
        });
    });

    //=>控制时间进度
    let autoTimer = null;
    $plan.add(() => {
        let duration = musicAudio.duration;
        $duration.html(computedTime(duration));

        autoTimer = setInterval(() => {
            let currentTime = musicAudio.currentTime;
            if (currentTime >= duration) {

                clearInterval(autoTimer);
                $already.html(computedTime(duration));
                $current.css('width', '100%');

                musicAudio.pause();
                $playBtn.removeClass('move');
                return;
            }
            //=>正在播放
            $already.html(computedTime(currentTime));
            $current.css('width', currentTime / duration * 100 + '%');
            matchLyric(currentTime)
        }, 1000);

    });

    //=>计算时间
    let computedTime = function (time) {
        let minutes = Math.floor(time / 60),
            seconds = Math.floor(time - minutes * 60);
        minutes < 10 ? minutes = '0' + minutes : null;
        seconds < 10 ? seconds = '0' + seconds : null;
        return `${minutes}:${seconds}`
    };

    //=>匹配歌词实现歌词对应
    let translateY = 0;
    let matchLyric = function (currentTime) {
        let [minutes, seconds] = computedTime(currentTime).split(':');

        let $cur = $lyricList.filter(`[data-minutes="${minutes}"]`).filter(`[data-seconds="${seconds}"]`);
        if ($cur.length === 0) return;
        if ($cur.hasClass('active')) return;

        let index = $cur.index();
        $cur.addClass('active')
            .siblings().removeClass('active');
        if (index >= 4) {
            //=>已经对应超过四条歌词了,接下来每当对应一条都让WRAPPER向上移动一行
            let curH = $cur[0].offsetHeight;
            translateY -= curH;
            $wrapper.css('transform', `translateY(${translateY}px)`);
        }
    };

    /*let translateY = 0;
    let matchLyric = function matchLyric(currentTime) {
        let [minutes, seconds] = computedTime(currentTime).split(':');
        let $cur = $lyricList.filter(`[data-minutes="${minutes}"]`).filter(`[data-seconds="${seconds}"]`);
        if ($cur.length === 0) return;
        if ($cur.hasClass('active')) return;
        let index = $cur.index();
        $cur.addClass('active')
            .siblings().removeClass('active');
        if (index >= 4) {
            let curH = $cur[0].offsetHeight;
            translateY -= curH;
            $wrapper.css('transform', `translateY(${translateY}px)`);
        }
    };*/

    return {
        init: function () {
            computedContentH();
            window.addEventListener('resize', computedContentH);
            let promise = queryLyric();
            promise.then(result => {
                let {lyric = ''} = result,
                    obj = {32: ' ', 40: '(', 41: ')', 45: '-'};
                lyric = lyric.replace(/&#(\d+);/g, (...arg) => {
                    let [item, num] = arg;
                    item = obj[num] || item;
                    return item;
                });
                return lyric;
            }).then(lyric => {
                //=>LYRIC:上一次处理好的结果
                //=>FORMAT-DATA:把歌词对应的分钟、秒、歌词内容等信息依次存储起来
                lyric += '&#10;';//=>向歌词末尾直接结束符
                let lyricAry = [],
                    reg = /\[(\d+)&#58;(\d+)&#46;\d+\]([^&#]+)&#10;/g;
                lyric.replace(reg, (...arg) => {
                    let [, minutes, seconds, content] = arg;
                    lyricAry.push({
                        minutes,
                        seconds,
                        content
                    });
                });
                return lyricAry;
            }).then(bindHTML).then(playRun);
        }
    }
})();
musicRender.init();