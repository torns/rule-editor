import yaml from 'js-yaml';
import { escapeForRegExp } from '@sanjo/escape-for-reg-exp';
import File from './data/File';

export default class RuleList
{
    isJsonFormat!: boolean
    configObject: any

    rulesCommon: Array<string>
    rulesOnce: Array<string>

    escapes = '!#$%&,~;\'.@^+-()[]{}'

    constructor()
    {
        this.rulesCommon = []
        this.rulesOnce = []
    }

    loadRules(text: string, isJsonFormat: boolean)
    {
        this.isJsonFormat = isJsonFormat
        this.configObject = isJsonFormat ? JSON.parse(text) : yaml.load(text)

        for (const rule of this.configObject.common_mode)
            this.rulesCommon.push(this.deescapePath(rule))

        for (const rule of this.configObject.once_mode)
            this.rulesOnce.push(this.deescapePath(rule))
    }

    removeRule(rule: string, isCommonRule: boolean)
    {
        if (isCommonRule)
        {
            let idx = this.rulesCommon.indexOf(rule)
            if (idx != -1)
                this.rulesCommon.splice(idx, 1)
        } else {
            let idx = this.rulesOnce.indexOf(rule)
            if (idx != -1)
                this.rulesOnce.splice(idx, 1)
        }
    }

    getRuleCount(path: string): number
    {
        let count = 0

        // console.log('path: ', path);

        for (const rule of this.rulesCommon)
            if (rule.startsWith(path))
                count += 1
        
        for (const rule of this.rulesOnce)
            if (rule.startsWith(path))
                count += 1

        return count
    }

    /**
     * 计算目录下的无效更新规则
     * @param path 要计算的目录
     * @param filenames 要计算的目录下的现有文件的文件名们
     * @returns 要计算的目录下的所有无效更新规则
     */
    getInvalidRules(path: string, filenames: Array<string>): [Array<string>, Array<string>]
    {
        function findInvalid(rules: Array<string>): Array<string>
        {
            let invalid: Array<string> = []

            for (const rule of rules)
            {
                // 只有前面匹配的规则才做进一步处理
                if (!rule.startsWith(path))
                    continue
    
                // 截取后面的部分，并删除slash方便判断
                let rest = rule.substring(path.length)
                if (rest.startsWith('/'))
                    rest = rest.substring(1)
    
                // 寻找规则中的下一级目录有没有在实际目录中出现，
                // 如果有，直接continue交给子目录渲染时去处理，就不在此处处理
                // 另外： RULE/ （仅带/）和 RULE （连/也不带） 也被视作当前目录下的无效规则
                let restSplit = rest.split('/')
                if (filenames.indexOf(restSplit[0]) != -1)
                    continue
                
                // 已经确认是无效规则
                invalid.push(rule)
            }

            return invalid
        }
        
        // console.log(path)

        return [findInvalid(this.rulesCommon), findInvalid(this.rulesOnce)]
    }

    getFileState(path: string): number
    {
        return this.getFileStateInternal(path)[0]
    }

    setFileState(path: string, state: number)
    {
        let fs = this.getFileStateInternal(path)
        let _state = fs[0]
        let _index = fs[1]

        if (_state == 1 && state != 1)
            this.rulesCommon.splice(_index, 1)
        
        if (_state == 2 && state != 2)
            this.rulesOnce.splice(_index, 1)
        
        if (_state != 1 && state == 1)
            this.rulesCommon.push(path)
        
        if (_state != 2 && state == 2)
            this.rulesOnce.push(path)
    }

    escapePath(path: string): string
    {
        let p = path

        for (const e of this.string2chars(this.escapes))
        {
            let escaped = escapeForRegExp(e)
            p = p.replace(new RegExp(escaped, 'g'), escaped)
        }

        return '@' + p
    }

    deescapePath(path: string): string
    {
        let p = path
        if (p.startsWith('@'))
            p = p.substring(1)

        for (const e of this.string2chars(this.escapes))
        {
            let escaped = escapeForRegExp(escapeForRegExp(e))
            p = p.replace(new RegExp(escaped, 'g'), e)
        }

        return p
    }

    toText(): any
    {
        let rulesCommon = this.rulesCommon.map(p => this.escapePath(p))
        let rulesOnce = this.rulesOnce.map(p => this.escapePath(p))

        let obj = {
            ...this.configObject,
            common_mode: rulesCommon,
            once_mode: rulesOnce,
        }

        return this.isJsonFormat ? JSON.stringify(obj, undefined, 4) : yaml.dump(obj)
    }

    private string2chars(str: string): Array<string>
    {
        let result = []
        for (let i = 0; i < str.length; i++)
            result.push(str[i])
        return result
    }

    private getFileStateInternal(path: string): [number, number]
    {
        let rcIndex = this.rulesCommon.findIndex(p => p == path)
        if (rcIndex != -1)
            return [1, rcIndex]
        
        let roIndex = this.rulesOnce.findIndex(p => p == path)
        if (roIndex != -1)
            return [2, roIndex]
        
        return [0, 0]
    }
}