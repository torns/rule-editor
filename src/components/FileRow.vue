<template>
    <div class="file-row" :style="'--indent: '+indent+';'">
        <div class="file-row-info" :type="type()" :state="state()" @click="expand()">
            <div style="min-width: 16px" :style="isDir() ? '' : 'opacity: 0'">
                {{file.expanded ? '▼' : '▶'}}
            </div>
            
            <div class="file-row-filename" :title="file.filename">
                {{file.filename}}
            </div>

            <div class="file-row-modified">
                <div class="file-row-modified-text">{{formatTime(file.modified)}}</div>
                <div class="file-row-set-update-method">
                    <button type="button" class="file-row-set-update-method-1" :active="getFileState() != 1 ? undefined : ''" @:click="setFileState(1)">普通</button>
                    <button type="button" class="file-row-set-update-method-2" :active="getFileState() != 2 ? undefined : ''" @:click="setFileState(2)">补全</button>
                    <button type="button" class="file-row-set-update-method-0" :active="getFileState() != 0 ? undefined : ''" @:click="setFileState(0)">忽略</button>
                </div>
            </div>

            <div class="file-row-length">
                {{isDir() ? '' : bytesToSize(file.length)}}
            </div>            
        </div>

        <div class="file-row-files" v-if="file.expanded">
            <file-row
                v-for="f in (file.files as Array<File>)"
                :parent="parent + (parent != '' ? '/' : '') + f.filename"
                :file="f"
                :indent="indent + 1"
            ></file-row>
        </div>
    </div>
</template>

<script lang="ts">
import moment from "moment";
import { defineComponent } from "vue";
import File from "../data/File";
import { bytesToSize } from "../utils";
import prettyBytes from 'pretty-bytes';

export default defineComponent({
    name: 'file-row',
    data: (() => ({
    })),
    computed: {
        
    },
    methods: {
        state() {
            let s = this.getFileState()
            return this.isDir() ? 
                (this.file.fetching ? 'fetching' : 'fetched') : 
                (s == 0 ? 'none' : (s == 1 ? 'common' : 'once'))
        },
        isDir() {
            return this.file.length < 0
        },
        type() {
            return this.isDir() ? 'dir' : 'file'
        },
        formatTime(time: number) {
            return moment(time * 1000).format('YYYY-MM-DD HH:mm:ss')
        },
        bytesToSize(bytes: number) {
            return prettyBytes(bytes)
        },
        getFileState () {
            return this.$root.getFileState(this.file)
        },
        setFileState(state: number) {
            this.$root.setFileState(this.file, state)
            this.$forceUpdate()
        },
        expand() {
            if (!this.isDir())
                return
            
            if (!this.file.fetching && !this.file.isDirectoryFetched())
                this.$root.listFiles(this.file).then(() => {
                    this.$forceUpdate()
                })

            this.file.expanded = !this.file.expanded
            this.$forceUpdate()
        },
    },
    props: {
        parent: { type: String, required: true },
        file: { type: File, required: true },
        indent: { type: Number, required: true }
    }
})
</script>

<style lang="stylus" scoped>
.file-row
    display: flex
    flex-direction: column;

    *
        user-select: none

    .file-row-info
        display: flex
        border: solid 1px #00000000;
        padding-left: calc(var(--indent) * 2rem );

        &:hover
            border-color: #444
        
        &[state=common]
            color: #00ffb9;
            // background-color: #3badcf;
            // color: #000;
        
        &[state=once]
            color: #e1e100;
            // background-color: #b5a80f;
            // color: #000;
        
        &[state=none]
            color: #787878;
        
        &[type=file]
            &:hover
                .file-row-modified-text
                    // display: none
                    opacity: 0.5
            
            &:not(:hover)
                .file-row-set-update-method
                    display: none

        &[type=dir]
            .file-row-set-update-method
                display: none

        &[state=fetching]
            .file-row-filename
                &::before
                    content: ""
                    animation: loading 1s infinite
                // &::after
                //     content: " (正在获取目录下的文件...)"
        .file-row-set-update-method
            position: absolute
            top: 0px
            left: 0px
            right: 0px
            bottom: 0px
            display: flex
            gap: 14px;
            // margin-left: 6px;
            
            .file-row-set-update-method-0[active]
                background-color: #787878;

            .file-row-set-update-method-1[active]
                background-color: #00ffb9;
            
            .file-row-set-update-method-2[active]
                background-color: #e1e100;
                

        .file-row-filename
            flex-grow: 1
            flex-shrink: 1
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;

        .file-row-modified
            width: 20vw
            min-width: 170px
            white-space: nowrap;
            position: relative

        .file-row-length
            width: 10vw
            min-width: 65px
            text-align: right;
            white-space: nowrap;
    
    .file-row-files
        display: flex
        flex-direction: column;

@keyframes loading
    0%
        content: "| "
    12%
        content: "/ "
    25%
        content: "- "
    37%
        content: "\\ "
    50%
        content: "| "
    62%
        content: "\/ "
    75%
        content: "- "
    87%
        content: "\\ "
    100%
        content: "| "
</style>