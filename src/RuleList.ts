import yaml from 'js-yaml';
import { escapeForRegExp } from '@sanjo/escape-for-reg-exp';

export default class RuleList
{
    isJsonFormat
    configObject: any

    rulesCommon: Array<string>
    rulesOnce: Array<string>

    escapes = '!#$%&,~;\'.@^+-()[]{}'

    constructor(text: string, isJsonFormat: boolean)
    {
        this.isJsonFormat = isJsonFormat

        this.rulesCommon = []
        this.rulesOnce = []

        this.configObject = isJsonFormat ? JSON.parse(text) : yaml.load(text)

        for (const rule of this.configObject.common_mode)
            this.rulesCommon.push(this.deescapePath(rule))

        for (const rule of this.configObject.once_mode)
            this.rulesOnce.push(this.deescapePath(rule))
    }

    getFileState(path: string): number
    {
        return this.getFileStateInternal(path)[0]
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
}