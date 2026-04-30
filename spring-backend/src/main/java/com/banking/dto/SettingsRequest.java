package com.banking.dto;

public class SettingsRequest {
    private Double limit;
    private String theme;

    public Double getLimit() { return limit; }
    public void setLimit(Double limit) { this.limit = limit; }
    
    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }
}
